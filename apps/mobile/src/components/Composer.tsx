import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Link2, Mic, Paperclip, Send } from "lucide-react-native";
import { features, isAllowedUploadFile, splitUrlAndComment } from "@inbox/api-client";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { COMPOSER_DRAFT_KEY, mmkv } from "../storage";
import { useToast } from "./Toast";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { GlassSurface } from "./GlassSurface";
import { RecorderBar } from "./RecorderBar";
import { useRecorderFlow } from "../hooks/useRecorder";
import { domainOf } from "../lib/format";

const PICKER_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "audio/*",
  "video/*",
];

/**
 * Messenger-style composer (web parity): autosize input, MMKV drafts, link
 * preview chip, send/mic swap, document picker attachments (M1, no size
 * limit) and expo-audio recording via the shared useRecorderFlow hook.
 */
export function Composer() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const rec = useRecorderFlow();

  const [text, setTextState] = useState(() => mmkv.getString(COMPOSER_DRAFT_KEY) ?? "");
  const [inputHeight, setInputHeight] = useState(40);
  const [busy, setBusy] = useState(false);

  const setText = (value: string) => {
    setTextState(value);
    mmkv.set(COMPOSER_DRAFT_KEY, value);
  };

  const invalidateFeed = () => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
  };

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

  const sendAudio = async () => {
    if (!rec.recordingUri || busy) return;
    setBusy(true);
    try {
      await api.saveAudio({
        blob: {
          uri: rec.recordingUri,
          name: `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.m4a`,
          mimeType: "audio/mp4",
          size: rec.fileSize || undefined,
        },
        durationMs: rec.durationMs,
      });
      rec.discard();
      invalidateFeed();
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const urlPreview = (() => {
    const split = splitUrlAndComment(text);
    if (split) return domainOf(split.url);
    const trimmed = text.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) return domainOf(trimmed);
    return null;
  })();

  const hasContent = text.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <RecorderBar rec={rec} sending={busy} onSendAudio={() => void sendAudio()} />

      {rec.phase === "idle" && (
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
                onPress={() => void rec.start()}
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
        visible={rec.micDenied}
        title={t("recorder.micDeniedTitle")}
        description={t("recorder.micDeniedBody")}
        onClose={rec.dismissMicDenied}
        footer={<Button variant="primary" label={t("common.close")} onPress={rec.dismissMicDenied} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
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
});
