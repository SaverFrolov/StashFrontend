import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { glass, rgba } from "@inbox/ui-core";
import { useTheme } from "../theme/ThemeProvider";

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Render a solid tinted surface instead of blur. Use for list rows/cards and
   * low-end devices — blur on Android is expensive (migration plan rule:
   * blur only for header, tab bar, composer, sheets, dialogs).
   */
  fallback?: boolean;
  /** Extra accent tint compensating Android's missing backdrop saturate(). */
  tint?: boolean;
}

/**
 * Liquid-glass panel: translucent green-tinted surface + hairline border.
 * Web parity: blur 20px + saturate 160% -> intensity mapping below; Android
 * gets a richer tint overlay instead of saturate (per migration plan).
 */
export function GlassSurface({ children, style, fallback = false, tint = true }: GlassSurfaceProps) {
  const { tokens, theme } = useTheme();
  const borderColor = tokens.glassBorder;

  if (fallback) {
    return (
      <View
        style={[
          {
            backgroundColor: tokens.surface,
            borderColor,
            borderWidth: StyleSheet.hairlineWidth,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      tint={theme === "dark" ? "dark" : "light"}
      intensity={Math.min(100, Math.round(glass.blurPx * 4))}
      experimentalBlurMethod={Platform.OS === "android" ? "none" : undefined}
      style={[
        {
          overflow: "hidden",
          borderColor,
          borderWidth: StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      {/* Green-tinted surface layer (no white anywhere) + saturate compensation */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.surface }]}
      />
      {tint && Platform.OS === "android" && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: rgba(tokens.accentRgb, 0.06) }]}
        />
      )}
      {children}
    </BlurView>
  );
}
