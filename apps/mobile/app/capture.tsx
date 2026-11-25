import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { toDataUrl } from "../src/lib/dataUrl";
import { Check, File as FileIcon, Mic, Paperclip, Square, X } from "lucide-react-native";
import { features, isAllowedUploadFile, splitUrlAndComment } from "@inbox/api-client";
import { radii, rgba } from "@inbox/ui-core";
import { fonts, useTheme } from "../src/theme/ThemeProvider";
import { getApiClient } from "../src/api";
import { useAuth } from "../src/state/AuthContext";
import { Field, Input } from "../src/components/Field";
import { Button } from "../src/components/Button";
import { GlassSurface } from "../src/components/GlassSurface";
import { Dialog } from "../src/components/Dialog";
import { RecorderBar } from "../src/components/RecorderBar";
import { useRecorderFlow } from "../src/hooks/useRecorder";
import { useToast } from "../src/components/Toast";
import { parseSharePayloads } from "../src/lib/share";
import type { SharedFile } from "../src/lib/share";
import { formatBytes } from "../src/lib/format";

const PICKER_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "audio/*",
  "video/*",
];

/**
 * S11 — full-screen quick capture. Doubles as the Android/iOS share target:
 * incoming payloads (text/url/files) are read via expo-sharing on mount,
 * files are copied out of the sharing cache, then payloads are cleared.
 * Prefill also works through stash://capture?text=&url= deep links.
 */
export default function CaptureRoute() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const rec = useRecorderFlow();
  const params = useLocalSearchParams<{ text?: string; url?: string }>();

  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [attached, setAttached] = useState<SharedFile[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fromShare, setFromShare] = useState(false);

  // Deep-link prefill (stash://capture?text=...&url=...)
  useEffect(() => {
    const parts = [params.url, params.text].filter((v): v is string => Boolean(v));
    if (parts.length) setText(parts.join("\n"));
  }, [params.text, params.url]);

  // Incoming system share (ACTION_SEND / iOS share sheet)
  useEffect(() => {
    void (async () => {
      try {
        const payloads = Sharing.getSharedPayloads();
        if (!payloads.length) return;
        const parsed = parseSharePayloads(payloads);
        if (parsed.text) {
          setFromShare(true);
          setText((prev) => (prev ? `${prev}\n${parsed.text}` : parsed.text!));
        }
        // Copy shared files out of the sharing cache before clearing payloads
        const copied: SharedFile[] = [];
        for (const [i, f] of parsed.files.entries()) {
          try {
            const dest = `${FileSystem.cacheDirectory ?? ""}share-${Date.now()}-${i}-${f.name}`;
            await FileSystem.copyAsync({ from: f.uri, to: dest });
            copied.push({ ...f, uri: dest });
          } catch {
            copied.push(f);
          }
        }
        if (copied.length) {
          setFromShare(true);
          setAttached((prev) => [...prev, ...copied]);
        }
        Sharing.clearSharedPayloads();
      } catch {
        /* sharing receive unavailable — capture stays manual */
      }
    })();
  }, []);

  const invalidateFeed = () => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
  };

  const attach = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: PICKER_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const files: SharedFile[] = res.assets.map((a) => ({
        uri: a.uri,
        name: a.name ?? "file",
        mimeType: a.mimeType ?? "",
      }));
      setAttached((prev) => [...prev, ...files]);
    } catch {
      toast.toast({ variant: "error", message: t("modals.uploadFailed") });
    }
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const commentValue = comment.trim() || undefined;
      if (rec.phase === "stopped" && rec.recordingUri) {
        await api.saveAudio({
          blob: {
            uri: await toDataUrl(rec.recordingUri, "audio/mp4"),
            name: `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.m4a`,
            mimeType: "audio/mp4",
            size: rec.fileSize || undefined,
          },
          durationMs: rec.durationMs,
          comment: commentValue,
        });
      } else if (attached.length > 0) {
        for (const f of attached) {
          if (!isAllowedUploadFile({ name: f.name, type: f.mimeType })) {
            toast.toast({ variant: "error", message: `${f.name}: ${t("modals.uploadInvalidType")}` });
            continue;
          }
          await api.saveFile({
            file: { uri: await toDataUrl(f.uri, f.mimeType), name: f.name, mimeType: f.mimeType },
            comment: commentValue,
          });
        }
      } else {
        const value = text.trim();
        if (!value) return;
        const urlSplit = splitUrlAndComment(value);
        if (urlSplit) {
          await api.saveLink({
            url: urlSplit.url,
            comment: [urlSplit.rest, commentValue].filter(Boolean).join(" ") || undefined,
          });
        } else {
          await api.saveText({ text: value, comment: commentValue });
        }
      }
      invalidateFeed();
      setSaved(true);
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  if (saved) {
    return (
      <View style={[styles.savedRoot, { paddingTop: insets.top }]}>
        <View style={[styles.savedIcon, { backgroundColor: tokens.accentSubtle }]}>
          <Check size={24} color={tokens.accent} strokeWidth={2} />
        </View>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 }}>
          {t("capture.savedTitle")}
        </Text>
        <View style={styles.savedButtons}>
          <Button
            variant="secondary"
            label={t("capture.saveAnother")}
            onPress={() => {
              setSaved(false);
              setText("");
              setComment("");
              setAttached([]);
              setFromShare(false);
              rec.discard();
            }}
          />
          <Button variant="primary" label={t("capture.openInbox")} onPress={() => router.replace("/(tabs)")} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <X size={20} color={tokens.textSecondary} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 16, flex: 1, textAlign: "center" }}>
          {t("capture.title")}
        </Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {fromShare ? (
          <View
            accessibilityRole="text"
            style={[styles.shareNotice, { borderColor: tokens.glassBorder, backgroundColor: tokens.surfaceSubtle, borderRadius: radii.control }]}
          >
            <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
              {t("capture.sharedFromPhone")}
            </Text>
          </View>
        ) : null}

        <RecorderBar rec={rec} sending={busy} onSendAudio={() => void save()} />

        <Field label={t("capture.linkOrText")}>
          <Input
            value={text}
            onChangeText={setText}
            multiline
            placeholder={t("composer.placeholder")}
            style={{ minHeight: 110 }}
          />
        </Field>

        <Field label={t("capture.comment")}>
          <Input value={comment} onChangeText={setComment} multiline style={{ minHeight: 64 }} />
        </Field>

        {attached.map((f, i) => {
          const valid = isAllowedUploadFile({ name: f.name, type: f.mimeType });
          return (
            <View
              key={`${f.uri}-${i}`}
              style={[styles.fileRow, { borderColor: valid ? tokens.glassBorder : rgbaDanger(tokens), borderRadius: radii.control }]}
            >
              <FileIcon size={18} color={tokens.textTertiary} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14 }}>
                  {f.name}
                </Text>
                <Text style={{ color: valid ? tokens.textTertiary : tokens.danger, fontFamily: fonts.regular, fontSize: 11 }}>
                  {valid ? f.mimeType || "file" : t("modals.uploadInvalidType")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("common.delete")}: ${f.name}`}
                onPress={() => setAttached((prev) => prev.filter((_, idx) => idx !== i))}
                hitSlop={8}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              >
                <X size={15} color={tokens.textTertiary} strokeWidth={1.5} />
              </Pressable>
            </View>
          );
        })}

        <View style={styles.actionsRow}>
          <Button
            variant="secondary"
            label={t("capture.attachFile")}
            icon={<Paperclip size={15} color={tokens.text} strokeWidth={1.5} />}
            onPress={() => void attach()}
          />
          {features.audio && rec.phase === "idle" ? (
            <Button
              variant="secondary"
              label={t("capture.recordAudio")}
              icon={<Mic size={15} color={tokens.text} strokeWidth={1.5} />}
              onPress={() => void rec.start()}
            />
          ) : null}
          {features.audio && rec.phase === "recording" ? (
            <Button
              variant="danger"
              label={t("recorder.stop")}
              icon={<Square size={14} color={tokens.danger} strokeWidth={1.5} />}
              onPress={() => void rec.stop()}
            />
          ) : null}
        </View>

        <Button
          variant="primary"
          label={busy ? t("common.saving") : t("common.save")}
          loading={busy}
          disabled={busy || !(text.trim() || attached.length || (rec.phase === "stopped" && rec.recordingUri))}
          onPress={() => void save()}
          fullWidth
        />
      </ScrollView>

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

function rgbaDanger(tokens: { dangerRgb: [number, number, number] }): string {
  return rgba(tokens.dangerRgb, 0.5);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  shareNotice: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  savedRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  savedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  savedButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});
