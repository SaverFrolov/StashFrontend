import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Check, File as FileIcon, Mic, Paperclip, Square, X } from "lucide-react";
import { Button, Field, Textarea, cn } from "@inbox/ui";
import { FILE_ACCEPT_ATTR, isAllowedUploadFile, splitUrlAndComment } from "@inbox/api-client";
import { useApi } from "../state/api";
import { useModals } from "../modals/ModalProvider";
import { formatBytes, formatDuration } from "../lib/format";

/**
 * S11 /capture — mobile-first full-screen quick capture.
 * Also the Web Share Target landing: prefilled from shared url/text/files
 * (POST multipart handled by the service worker -> query params fallback here).
 */
export function CaptureScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { openMicPermission } = useModals();

  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  // Audio recording state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);

  const stopTimer = () => window.clearInterval(timerRef.current);

  useEffect(() => stopTimer, []);

  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      openMicPermission("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        stopTimer();
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        setRecording(false);
      };
      recorder.start();
      startedAtRef.current = Date.now();
      timerRef.current = window.setInterval(() => setRecordMs(Date.now() - startedAtRef.current), 250);
      setRecording(true);
      setAudioBlob(null);
    } catch {
      openMicPermission("denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  // Prefill from Web Share Target (GET params fallback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url");
    const sharedText = params.get("text");
    const sharedTitle = params.get("title");
    const parts = [sharedUrl, sharedText, sharedTitle].filter(Boolean);
    if (parts.length > 0) {
      setText(parts.join("\n"));
      setComment("");
    }
    // Handle POST share target payload (files) via service worker relay
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; url?: string; files?: File[] }>).detail;
      if (detail?.text) setText((prev) => (prev ? `${prev}\n${detail.text}` : detail.text!));
      if (detail?.url) setText((prev) => (prev ? `${prev}\n${detail.url}` : detail.url!));
      if (detail?.files?.length) setFile(detail.files[0]);
    };
    window.addEventListener("inbox:share-target", handler);
    return () => window.removeEventListener("inbox:share-target", handler);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (audioBlob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        return api.saveAudio({
          blob: {
            name: `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`,
            size: audioBlob.size,
            mime: audioBlob.type || "audio/webm",
            dataUrl,
          },
          durationMs: recordMs,
          comment: comment.trim() || undefined,
        });
      }
      if (file) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const mime = file.type || "application/pdf";
        return api.saveFile({
          file: { name: file.name, size: file.size, mime, dataUrl },
          comment: comment.trim() || undefined,
        });
      }
      const value = text.trim();
      const urlSplit = splitUrlAndComment(value);
      if (urlSplit) {
        return api.saveLink({
          url: urlSplit.url,
          comment: [urlSplit.rest, comment.trim()].filter(Boolean).join(" ") || undefined,
        });
      }
      return api.saveText({ text: value, comment: comment.trim() || undefined });
    },
    onSuccess: () => setSaved(true),
  });

  const fileValid = !file || isAllowedUploadFile(file);

  const canSave = Boolean(text.trim() || file || audioBlob) && fileValid && !saveMutation.isPending;

  if (saved) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <Check size={24} strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-text">{t("capture.savedTitle")}</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSaved(false);
              setText("");
              setComment("");
              setFile(null);
              setAudioBlob(null);
              setRecordMs(0);
            }}
          >
            {t("capture.saveAnother")}
          </Button>
          <Button variant="primary" onClick={() => navigate("/inbox")}>
            {t("capture.openInbox")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-glass-border bg-surface px-4">
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => navigate("/inbox")}
          className="rounded p-2 text-text-secondary hover:bg-surface-subtle"
        >
          <X size={18} strokeWidth={1.5} aria-hidden />
        </button>
        <h1 className="text-md font-semibold text-text">{t("capture.title")}</h1>
        <span className="w-9" aria-hidden />
      </header>

      <main className="mx-auto flex w-full max-w-feed flex-1 flex-col gap-4 p-4">
        {new URLSearchParams(window.location.search).toString() && (
          <p role="status" className="rounded-control border border-glass-border bg-surface-subtle px-3 py-2 text-sm text-text-secondary">
            {t("capture.sharedFromPhone")}
          </p>
        )}

        <Field label={t("capture.linkOrText")} htmlFor="cap-text">
          <Textarea
            id="cap-text"
            autoFocus
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("composer.placeholder")}
          />
        </Field>

        <Field label={t("capture.comment")} htmlFor="cap-comment">
          <Textarea id="cap-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>

        {file && (
          <div className="flex items-center gap-3 rounded-control border border-glass-border bg-surface p-3">
            <FileIcon size={18} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base text-text">{file.name}</span>
              <span className={cn("tnum block text-xs", fileValid ? "text-text-tertiary" : "text-danger")}>
                {fileValid ? formatBytes(file.size) : t("modals.uploadInvalidType")}
              </span>
            </span>
            <button
              type="button"
              aria-label={t("common.delete")}
              onClick={() => setFile(null)}
              className="rounded p-1.5 text-text-tertiary hover:text-danger"
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}

        {audioBlob && !recording && (
          <div className="flex items-center gap-3 rounded-control border border-glass-border bg-surface p-3">
            <Mic size={18} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
            <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 min-w-0 flex-1" aria-label={t("recorder.preview")} />
            <span className="tnum shrink-0 text-xs text-text-tertiary">{formatDuration(recordMs)}</span>
            <button
              type="button"
              aria-label={t("recorder.discard")}
              onClick={() => {
                setAudioBlob(null);
                setRecordMs(0);
              }}
              className="rounded p-1.5 text-text-tertiary hover:text-danger"
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 max-sm:h-11 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-base text-text hover:bg-surface-subtle">
            <Paperclip size={16} strokeWidth={1.5} aria-hidden />
            {t("capture.attachFile")}
            <input
              type="file"
              className="hidden"
              accept={FILE_ACCEPT_ATTR}
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          {recording ? (
            <Button variant="danger" onClick={stopRecording}>
              <Square size={16} strokeWidth={1.5} aria-hidden />
              <span className="tnum">{formatDuration(recordMs)}</span>
              {t("recorder.stop")}
            </Button>
          ) : (
            <Button onClick={() => void startRecording()}>
              <Mic size={16} strokeWidth={1.5} aria-hidden />
              {t("capture.recordAudio")}
            </Button>
          )}
        </div>

        <div className="mt-auto pt-6 pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="primary"
            className="h-12 w-full text-md"
            disabled={!canSave}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
          {saveMutation.isError && (
            <p role="alert" className="mt-2 text-center text-sm text-danger">
              {t("common.errorGeneric")}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
