import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { radii, touchTargets } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

/**
 * Primary: flat vertical accent gradient matching web's bg-gradient-to-b design.
 * No shadows or glows — web uses simple CSS gradient, mobile mirrors it.
 */
export function Button({
  label,
  onPress,
  variant = "secondary",
  size = "md",
  icon,
  disabled,
  loading,
  fullWidth,
  accessibilityLabel,
}: ButtonProps) {
  const { tokens } = useTheme();
  const height = size === "md" ? touchTargets.preferred : touchTargets.min;
  const isPrimary = variant === "primary";

  const textColor = isPrimary
    ? "#FFFFFF" // the only allowed white: text on accent buttons
    : variant === "danger"
      ? tokens.danger
      : tokens.text;

  const containerStyle = [
    styles.base,
    { height, borderRadius: radii.control },
    fullWidth && styles.fullWidth,
    !isPrimary && {
      backgroundColor: variant === "ghost" ? "transparent" : tokens.surface,
      borderColor: variant === "ghost" ? "transparent" : variant === "danger" ? tokens.danger : tokens.glassBorder,
      borderWidth: variant === "ghost" ? 0 : StyleSheet.hairlineWidth,
    },
    // Primary button is flat like web: gradient only, no shadow-glow
  ];

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: textColor,
              fontFamily: fonts.medium,
              fontSize: size === "md" ? 16 : 14,
              lineHeight: size === "md" ? 24 : 20,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 },
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[tokens.accent, tokens.accentHover]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  fullWidth: { alignSelf: "stretch" },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
