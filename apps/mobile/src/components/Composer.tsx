import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import type { RecordingOptions } from "expo-audio";
import { Link2, Mic, Paperclip, Pause, Play, Send, Square, Trash2 } from "lucide-react-native";
import { features, isAllowedUploadFile, splitUrlAndComment } from "@inbox/api-client";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { COMPOSER_DRAFT_KEY, mmkv } from "../storage";
import { useToast } from "./Toast";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { GlassSurface } from "./GlassSurface";
import { domainOf, formatDuration } from "../lib/format";

const RECORD_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const PICKER_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "audio/*",
  "video/*",
];

type RecorderPhase = "idle" | "recording" | "paused" | "stopped";

const LEVEL_BARS = 20;

/**
 * Messenger-style composer (web parity): autosize input, Enter-free send
 * button, mic <-> send swap, drafts persisted in MMKV, link preview chip,
 * expo-document-picker attachments (M1, no size limit) and expo-audio
 * recording with a live metering level bar.
 *
 * Deviation (documented in migration notes): expo-audio's AudioRecorder has
 * pause() but no resume() — from the paused state the user can Stop or
 * Discard; the recording is not lost.
 */
export function Composer() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [text, setTextState] = useState(() => mmkv.getString(COMPOSER_DRAFT_KEY) ?? "");
  const [inputHeight, setInputHeight] = useState(40);
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordDurationMs, setRecordDurationMs] = useState(0);
  const [recordFileSize, setRecordFileSize] = useState(0);
  const [micDenied, setMicDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const recState = useAudioRecorderState(recorder, 100);
  const player = useAudioPlayer(recordingUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (recordingUri) player.replace(recordingUri);
  }, [recordingUri, player]);

  const setText = (value: string) => {
    setTextState(value);
    mmkv.set(COMPOSER_DRAFT_KEY, value);
  };

  const invalidateFeed = () => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
  };

  // ---- send text / link ----
  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const urlSplit = splitUrlAndComment(value);
      if (urlSplit) {
        await api.saveLink({ url: urlSplit.url, comment: urlSplit.rest || undefined });
      } else {
        await api.saveText({ text: value });
      }
      setText("");
      setInputHeight(40);
      invalidateFeed();
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  // ---- M1: attach files (no size limit) ----
  const attach = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: PICKER_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      setBusy(true);
      let ok = 0;
      for (const asset of res.assets) {
        const name = asset.name ?? "file";
        const mimeType = asset.mimeType ?? "";
        if (!isAllowedUploadFile({ name, type: mimeType })) {
          toast.toast({ variant: "error", message: t("modals.uploadInvalidType") });
          continue;
        }
        await api.saveFile({
          file: { uri: asset.uri, name, mimeType, size: asset.size ?? undefined },
          comment: text.trim() || undefined,
        });
        ok += 1;
      }
      if (ok > 0) {
        setText("");
        invalidateFeed();
        toast.toast({ variant: "success", message: t("modals.uploadDone") });
      }
    } catch {
      toast.toast({ variant: "error", message: t("modals.uploadFailed") });
    } finally {
      setBusy(false);
    }
  };

  // ---- audio recording (expo-audio with metering) ----
  const startRecording = async () => {
    if (!features.audio) return;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMicDenied(true);
      return;
    }
    setRecordDurationMs(0);
    setPhase("recording");
    recorder.record();
  };

  const pauseRecording = () => {
    recorder.pause();
    setPhase("paused");
  };

  const stopRecording = async () => {
    const durationMs = recState.durationMillis;
    const size = recState.fileSize;
    await recorder.stop();
    const uri = recorder.uri;
    if (uri) {
      setRecordingUri(uri);
      setRecordDurationMs(durationMs);
      setRecordFileSize(size);
      setPhase("stopped");
    } else {
      setPhase("idle");
    }
  };

  const discardRecording = () => {
    if (phase === "recording" || phase === "paused") {
      void recorder.stop().catch(() => undefined);
    }
    player.pause();
    setRecordingUri(null);
    setRecordDurationMs(0);
    setRecordFileSize(0);
    setPhase("idle");
  };

  const sendAudio = async () => {
    if (!recordingUri || busy) return;
    setBusy(true);
    try {
      await api.saveAudio({
        blob: {
          uri: recordingUri,
          name: `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.m4a`,
          mimeType: "audio/mp4",
          size: recordFileSize || undefined,
        },
        durationMs: recordDurationMs,
      });
      discardRecording();
      invalidateFeed();
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const togglePlayback = () => {
    if (playerStatus?.playing) player.pause();
    else player.play();
  };

  const urlPreview = (() => {
    const split = splitUrlAndComment(text);
    if (split) return domainOf(split.url);
    const trimmed = text.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) return domainOf(trimmed);
    return null;
  })();

  const hasContent = text.trim().length > 0;
  const level =
    recState.metering !== undefined ? Math.max(0.04, Math.min(1, (recState.metering + 50) / 50)) : 0.04;

  return (
    <View style={styles.wrap}>
      {/* Recorder bar */}
      {(phase === "recording" || phase === "paused") && (
        <GlassSurface style={[styles.bar, { borderRadius: radii.dialog, borderColor: tokens.glassBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recorder.discard")}
            onPress={discardRecording}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Trash2 size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Text
            accessibilityLabel={t("recorder.elapsed")}
            style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14, fontVariant: ["tabular-nums"] }}
          >
            {formatDuration(recState.durationMillis)}
          </Text>
          {/* Live level bar (metering) */}
          <View
            style={styles.levelBar}
            accessibilityRole="none"
            accessibilityLabel={t("recorder.level")}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(level * 100) }}
          >
            {Array.from({ length: LEVEL_BARS }).map((_, i) => {
              const active = level * LEVEL_BARS > i;
              const variance = 0.45 + ((i * 37) % 55) / 100;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    borderRadius: 1,
                    backgroundColor: active ? tokens.accent : tokens.surfaceSubtle,
                    height: active ? Math.max(6, 24 * level * variance + 4) : 4,
                  }}
                />
              );
            })}
          </View>
          <View
            style={[styles.recDot, { backgroundColor: phase === "recording" ? tokens.danger : tokens.textTertiary }]}
            aria-hidden
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recorder.pause")}
            onPress={pauseRecording}
            disabled={phase === "paused"}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, (pressed || phase === "paused") && { opacity: 0.4 }]}
          >
            <Pause size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recorder.stop")}
            onPress={() => void stopRecording()}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Square size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
        </GlassSurface>
      )}

      {/* Inline player + Send/Discard */}
      {phase === "stopped" && recordingUri && (
        <GlassSurface style={[styles.bar, { borderRadius: radii.dialog, borderColor: tokens.glassBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recorder.discard")}
            onPress={discardRecording}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Trash2 size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recorder.preview")}
            onPress={togglePlayback}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            {playerStatus?.playing ? (
              <Pause size={18} color={tokens.text} strokeWidth={1.5} />
            ) : (
              <Play size={18} color={tokens.text} strokeWidth={1.5} />
            )}
          </Pressable>
          <Text style={{ flex: 1, color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, fontVariant: ["tabular-nums"] }}>
            {formatDuration((playerStatus?.currentTime ?? 0) * 1000)} / {formatDuration(recordDurationMs)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("composer.send")}
            onPress={() => void sendAudio()}
            disabled={busy}
            style={({ pressed }) => [
              styles.sendRound,
              { backgroundColor: tokens.accent, opacity: pressed || busy ? 0.6 : 1 },
            ]}
          >
            <Send size={16} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
        </GlassSurface>
      )}

      {/* Idle: attach | autosize input | send-or-mic */}
      {phase === "idle" && (
        <GlassSurface style={{ borderRadius: radii.dialog, padding: 8, gap: 6 }}>
          {urlPreview ? (
            <View style={styles.chipRow}>
              <Link2 size={12} color={tokens.textTertiary} strokeWidth={1.5} />
              <Text numberOfLines={1} style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11 }}>
                {urlPreview} — {t("composer.linkChip")}
              </Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("composer.attach")}
              onPress={() => void attach()}
              disabled={busy}
              hitSlop={4}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }, busy && { opacity: 0.4 }]}
            >
              <Paperclip size={20} color={tokens.textSecondary} strokeWidth={1.5} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              accessibilityLabel={t("composer.placeholder")}
              placeholder={t("composer.placeholder")}
              placeholderTextColor={tokens.textTertiary}
              onContentSizeChange={(e) => {
                const h = e.nativeEvent.contentSize.height;
                setInputHeight(Math.min(Math.max(40, h), 120));
              }}
              style={{
                flex: 1,
                height: inputHeight,
                maxHeight: 120,
                color: tokens.text,
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: 10,
                paddingBottom: 10,
                textAlignVertical: "top",
              }}
            />
            {hasContent ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("composer.send")}
                onPress={() => void send()}
                disabled={busy}
                style={({ pressed }) => [
                  styles.sendRound,
                  { backgroundColor: tokens.accent, opacity: pressed || busy ? 0.6 : 1 },
                ]}
              >
                <Send size={16} color="#FFFFFF" strokeWidth={1.5} />
              </Pressable>
            ) : features.audio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("composer.record")}
                onPress={() => void startRecording()}
                hitSlop={4}
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
              >
                <Mic size={20} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>
        </GlassSurface>
      )}

      {/* M10: microphone permission denied */}
      <Dialog
        visible={micDenied}
        title={t("recorder.micDeniedTitle")}
        description={t("recorder.micDeniedBody")}
        onClose={() => setMicDenied(false)}
        footer={
          <Button variant="primary" label={t("common.close")} onPress={() => setMicDenied(false)} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  sendRound: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    shadowColor: "#0E7C66",
    shadowOpacity: 0.4,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  levelBar: {
    flex: 1,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  recDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
