import { forwardRef } from "react";
import type { ComponentRef, ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { radii, touchTargets } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label + control + hint/error stack (web Field parity). */
export function Field({ label, hint, error, children }: FieldProps) {
  const { tokens } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>
        {label}
      </Text>
      {children}
      {hint && !error ? (
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 }}>
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: tokens.danger, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export type InputProps = TextInputProps & { multiline?: boolean };

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(function Input(
  { style, multiline, ...props },
  ref,
) {
  const { tokens } = useTheme();
  return (
    <TextInput
      ref={ref}
      multiline={multiline}
      placeholderTextColor={tokens.textTertiary}
      style={[
        {
          minHeight: multiline ? 88 : touchTargets.preferred,
          borderRadius: radii.control,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tokens.borderStrong,
          backgroundColor: tokens.surface,
          color: tokens.text,
          fontFamily: fonts.regular,
          fontSize: 16,
          lineHeight: 24,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          textAlignVertical: multiline ? "top" : "center",
        },
        style,
      ]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  field: { gap: 4 },
});
