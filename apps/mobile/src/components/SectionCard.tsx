import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

/** Settings section card (glass, fallback surface — no blur inside lists). */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <GlassSurface
      fallback
      style={{ borderRadius: radii.dialog, borderColor: tokens.glassBorder, padding: 16, gap: 12 }}
    >
      <Text accessibilityRole="header" style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 }}>
        {title}
      </Text>
      {children}
    </GlassSurface>
  );
}

/** Pressable checkbox row used by sheets (export includes, etc.). */
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.7 }]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? tokens.accent : tokens.borderStrong,
            backgroundColor: checked ? tokens.accent : "transparent",
          },
        ]}
      >
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
  },
});
