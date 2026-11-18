import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pause, Play, Send, Square, Trash2 } from "lucide-react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";
import type { RecorderFlow } from "../hooks/useRecorder";
import { formatDuration } from "../lib/format";

const LEVEL_BARS = 20;

/**
 * Recording bar (discard / timer / live level / pause / stop) and the stopped
 * state (inline player + Send / Discard). Shared by the Composer (S4) and
 * quick Capture (S11).
 */
export function RecorderBar({
  rec,
  sending,
  onSendAudio,
}: {
  rec: RecorderFlow;
  sending: boolean;
  onSendAudio: () => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  if (rec.phase === "recording" || rec.phase === "paused") {
    return (
      <GlassSurface style={[styles.bar, { borderRadius: radii.dialog, borderColor: tokens.glassBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recorder.discard")}
          onPress={rec.discard}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Trash2 size={18} color={tokens.textSecondary} strokeWidth={1.5} />
        </Pressable>
        <Text
          accessibilityLabel={t("recorder.elapsed")}
          style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14, fontVariant: ["tabular-nums"] }}
        >
          {formatDuration(rec.durationMs)}
        </Text>
        <View
          style={styles.levelBar}
          accessibilityLabel={t("recorder.level")}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(rec.level * 100) }}
        >
          {Array.from({ length: LEVEL_BARS }).map((_, i) => {
            const active = rec.level * LEVEL_BARS > i;
            const variance = 0.45 + ((i * 37) % 55) / 100;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 1,
                  backgroundColor: active ? tokens.accent : tokens.surfaceSubtle,
                  height: active ? Math.max(6, 24 * rec.level * variance + 4) : 4,
                }}
              />
            );
          })}
        </View>
        <View
          aria-hidden
          style={[styles.recDot, { backgroundColor: rec.phase === "recording" ? tokens.danger : tokens.textTertiary }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recorder.pause")}
          onPress={rec.pause}
          disabled={rec.phase === "paused"}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, (pressed || rec.phase === "paused") && { opacity: 0.4 }]}
        >
          <Pause size={18} color={tokens.textSecondary} strokeWidth={1.5} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recorder.stop")}
          onPress={() => void rec.stop()}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Square size={18} color={tokens.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </GlassSurface>
    );
  }

  if (rec.phase === "stopped" && rec.recordingUri) {
    return (
      <GlassSurface style={[styles.bar, { borderRadius: radii.dialog, borderColor: tokens.glassBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recorder.discard")}
          onPress={rec.discard}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Trash2 size={18} color={tokens.textSecondary} strokeWidth={1.5} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recorder.preview")}
          onPress={rec.togglePlayback}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          {rec.playerPlaying ? (
            <Pause size={18} color={tokens.text} strokeWidth={1.5} />
          ) : (
            <Play size={18} color={tokens.text} strokeWidth={1.5} />
          )}
        </Pressable>
        <Text
          style={{
            flex: 1,
            color: tokens.textSecondary,
            fontFamily: fonts.regular,
            fontSize: 13,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatDuration(rec.playerTimeMs)} / {formatDuration(rec.durationMs)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("composer.send")}
          onPress={onSendAudio}
          disabled={sending}
          style={({ pressed }) => [
            styles.sendRound,
            { backgroundColor: tokens.accent, opacity: pressed || sending ? 0.6 : 1 },
          ]}
        >
          <Send size={16} color="#FFFFFF" strokeWidth={1.5} />
        </Pressable>
      </GlassSurface>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
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
