import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Mic, Paperclip, Pause, Play, Send, Square, Trash2, WifiOff } from "lucide-react";
import { cn } from "@inbox/ui";
import { features, splitUrlAndComment } from "@inbox/api-client";
import { useApi, ITEM_UPDATED_EVENT } from "../state/api";
import { useOnline } from "../state/settings";
import { useModals } from "../modals/ModalProvider";
import { formatDuration, domainOf } from "../lib/format";

const DRAFT_KEY = "inbox-composer-draft";

type RecorderState = "idle" | "recording" | "paused" | "recorded";

/**
 * Messenger-style composer docked at the bottom, max width 720px.
 * - autosize textarea; Enter sends, Shift+Enter newline
 * - attach (PDF/DOCX) left; mic right, turns into Send when there is content
 * - single URL in input -> saved as link (domain chip preview); otherwise text note
 * - drafts persist across reloads; offline banner
 */
export function Composer() {
  const { t } = useTranslation();
  const api = useApi();
  const online = useOnline();
  const queryClient = useQueryClient();
  const { openUpload, openMicPermission } = useModals();

  const [text, setText] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Draft persistence
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, text);
  }, [text]);

  // Autosize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // External "New note" focus requests
  useEffect(() => {
    const handler = () => textareaRef.current?.focus();
    window.addEventListener("inbox:focus-composer", handler);
    return () => window.removeEventListener("inbox:focus-composer", handler);
  }, []);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
  }, [queryClient]);

  // Live status updates from MockApi pipeline
  useEffect(() => {
    const handler = () => invalidate();
    window.addEventListener(ITEM_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ITEM_UPDATED_EVENT, handler);
  }, [invalidate]);

  const saveText = useMutation({
    mutationFn: async (value: string) => {
      const urlSplit = splitUrlAndComment(value);
      if (urlSplit) {
        return api.saveLink({ url: urlSplit.url, comment: urlSplit.rest || undefined });
      }
      return api.saveText({ text: value });
    },
    onSuccess: () => {
      setText("");
      invalidate();
    },
  });

  const saveAudio = useMutation({
    mutationFn: async (blob: Blob) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return api.saveAudio({
        blob: {
          name: `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`,
          size: blob.size,
          mime: blob.type || "audio/webm",
          dataUrl,
        },
        durationMs: elapsedMs,
      });
    },
    onSuccess: () => {
      stopRecordingUI();
      invalidate();
    },
  });

  const stopRecordingUI = () => {
    setRecorderState("idle");
    setElapsedMs(0);
    setLevel(0);
    setRecordedUrl(null);
    setRecordedBlob(null);
    accumulatedRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const submit = () => {
    const value = text.trim();
    if (!value || saveText.isPending) return;
    saveText.mutate(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // ---- Audio recording (MediaRecorder) ----

  const tickTimer = () => {
    setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current));
  };

  const startLevelMeter = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 96));
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return ctx;
  };

  let audioCtxRef = useRef<AudioContext | null>(null);
  let timerRef = useRef<number>(0);

  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      openMicPermission("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setRecorderState("recorded");
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close().catch(() => undefined);
        audioCtxRef.current = null;
        window.clearInterval(timerRef.current);
      };
      recorder.start();
      startedAtRef.current = Date.now();
      timerRef.current = window.setInterval(tickTimer, 250);
      audioCtxRef.current = startLevelMeter(stream);
      setRecorderState("recording");
    } catch {
      openMicPermission("denied");
    }
  };

  const pauseRecording = () => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    accumulatedRef.current += Date.now() - startedAtRef.current;
    window.clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setLevel(0);
    setRecorderState("paused");
  };

  const resumeRecording = () => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    startedAtRef.current = Date.now();
    timerRef.current = window.setInterval(tickTimer, 250);
    if (streamRef.current) audioCtxRef.current = startLevelMeter(streamRef.current);
    setRecorderState("recording");
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const discardRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    window.clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    stopRecordingUI();
  };

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const urlPreview = (() => {
    const split = splitUrlAndComment(text);
    if (split) return domainOf(split.url);
    const trimmed = text.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) return domainOf(trimmed);
    return null;
  })();

  const hasContent = text.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-bg px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      {!online && (
        <p role="status" className="mx-auto mb-2 flex max-w-feed items-center gap-2 rounded-control border border-warning/40 bg-surface px-3 py-2 text-sm text-warning">
          <WifiOff size={14} strokeWidth={1.5} aria-hidden />
          {t("composer.offline")}
        </p>
      )}

      <div className="mx-auto max-w-feed">
        {recorderState !== "idle" && recorderState !== "recorded" && (
          /* Recorder bar: discard, elapsed, live level, pause/resume, stop */
          <div className="flex items-center gap-3 rounded-dialog border border-border bg-surface px-3 py-2" role="group" aria-label={t("recorder.recording")}>
            <button
              type="button"
              aria-label={t("recorder.discard")}
              title={t("recorder.discard")}
              onClick={discardRecording}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-danger"
            >
              <Trash2 size={18} strokeWidth={1.5} aria-hidden />
            </button>
            <span className="tnum text-base font-medium text-text" aria-label={t("recorder.elapsed")}>
              {formatDuration(elapsedMs)}
            </span>
            <div
              className="flex h-6 flex-1 items-end gap-[2px] overflow-hidden"
              role="meter"
              aria-valuenow={Math.round(level * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("recorder.level")}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-[height,background-color] duration-75",
                    level * 24 > i ? "bg-accent" : "bg-surface-subtle",
                  )}
                  style={{ height: level * 24 > i ? `${30 + ((i * 37) % 70)}%` : "20%" }}
                />
              ))}
            </div>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={cn("absolute inline-flex h-full w-full rounded-full", recorderState === "recording" ? "bg-danger" : "bg-text-tertiary")} />
            </span>
            <button
              type="button"
              aria-label={recorderState === "paused" ? t("recorder.resume") : t("recorder.pause")}
              title={recorderState === "paused" ? t("recorder.resume") : t("recorder.pause")}
              onClick={recorderState === "paused" ? resumeRecording : pauseRecording}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
            >
              {recorderState === "paused" ? <Play size={18} strokeWidth={1.5} aria-hidden /> : <Pause size={18} strokeWidth={1.5} aria-hidden />}
            </button>
            <button
              type="button"
              aria-label={t("recorder.stop")}
              title={t("recorder.stop")}
              onClick={stopRecording}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
            >
              <Square size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}

        {recorderState === "recorded" && recordedUrl && (
          /* Inline player with Send and Discard */
          <div className="flex items-center gap-3 rounded-dialog border border-border bg-surface px-3 py-2">
            <button
              type="button"
              aria-label={t("recorder.discard")}
              title={t("recorder.discard")}
              onClick={discardRecording}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-danger"
            >
              <Trash2 size={18} strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("recorder.preview")}
              onClick={() => {
                if (!audioRef.current) {
                  audioRef.current = new Audio(recordedUrl);
                  audioRef.current.onended = () => setPlaying(false);
                }
                if (playing) {
                  audioRef.current.pause();
                  setPlaying(false);
                } else {
                  void audioRef.current.play();
                  setPlaying(true);
                }
              }}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
            >
              {playing ? <Pause size={18} strokeWidth={1.5} aria-hidden /> : <Play size={18} strokeWidth={1.5} aria-hidden />}
            </button>
            <span className="tnum flex-1 text-sm text-text-secondary">{formatDuration(elapsedMs)}</span>
            <button
              type="button"
              aria-label={t("composer.send")}
              onClick={() => recordedBlob && saveAudio.mutate(recordedBlob)}
              disabled={saveAudio.isPending}
              className="flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-base font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Send size={16} strokeWidth={1.5} aria-hidden />
              {t("composer.send")}
            </button>
          </div>
        )}

        {recorderState === "idle" && (
          <div className="rounded-dialog border border-border bg-surface shadow-pop">
            {urlPreview && (
              <p className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-tertiary">
                <Link2 size={12} strokeWidth={1.5} aria-hidden />
                <span className="font-mono">{urlPreview}</span>
                <span>— {t("composer.linkChip")}</span>
              </p>
            )}
            <div className="flex items-end gap-1 p-2">
              <button
                type="button"
                aria-label={t("composer.attach")}
                title={t("composer.attach")}
                onClick={() => openUpload({ presetComment: text.trim() || undefined })}
                className="mb-0.5 rounded p-2 text-text-secondary hover:bg-surface-subtle hover:text-text"
              >
                <Paperclip size={20} strokeWidth={1.5} aria-hidden />
              </button>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                aria-label={t("composer.placeholder")}
                placeholder={t("composer.placeholder")}
                className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-base leading-[22px] text-text outline-none placeholder:text-text-tertiary"
              />
              {hasContent ? (
                <button
                  type="button"
                  aria-label={t("composer.send")}
                  title={`${t("composer.send")} (${t("shortcuts.send")})`}
                  onClick={submit}
                  disabled={saveText.isPending}
                  className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-control bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  <Send size={16} strokeWidth={1.5} aria-hidden />
                </button>
              ) : (
                features.audio && (
                  <button
                    type="button"
                    aria-label={t("composer.record")}
                    title={t("composer.record")}
                    onClick={() => void startRecording()}
                    className="mb-0.5 rounded p-2 text-text-secondary hover:bg-surface-subtle hover:text-text"
                  >
                    <Mic size={20} strokeWidth={1.5} aria-hidden />
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
