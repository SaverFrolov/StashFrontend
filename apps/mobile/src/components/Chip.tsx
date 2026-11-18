import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

export interface ChipProps {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  /** dashed outline = AI suggestion (web parity) */
  dashed?: boolean;
  active?: boolean;
}

/** Compact chip (24dp): filters, collections. Touch handled by parent rows. */
export function Chip({ label, children, onPress, dashed, active }: ChipProps) {
  const { tokens } = useTheme();
  const content = (
    <>
      {children}
      {label ? (
        <Text
          numberOfLines={1}
          style={{
            color: active ? tokens.accent : tokens.textSecondary,
            fontFamily: fonts.regular,
            fontSize: 12,
            lineHeight: 16,
          }}
        >
          {label}
        </Text>
      ) : null}
    </>
  );
  const boxStyle = {
    height: 24,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: dashed ? ("dashed" as const) : ("solid" as const),
    borderColor: active ? tokens.accent : tokens.borderStrong,
    backgroundColor: active ? tokens.accentSubtle : "transparent",
    paddingHorizontal: 8,
  };
  if (!onPress) {
    return <View style={[styles.row, boxStyle]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, boxStyle, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

export interface TagChipProps {
  label: string;
  suggested?: boolean;
  onAccept?: () => void;
  onRemove?: () => void;
  acceptLabel?: string;
  removeLabel?: string;
}

/** Tag chip (M4 parity): solid = confirmed user tag, dashed = AI suggestion. */
export function TagChip({ label, suggested, onAccept, onRemove, acceptLabel, removeLabel }: TagChipProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          minHeight: 24,
          borderRadius: radii.control,
          borderWidth: StyleSheet.hairlineWidth,
          borderStyle: suggested ? "dashed" : "solid",
          borderColor: tokens.borderStrong,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          color: suggested ? tokens.textSecondary : tokens.text,
          fontFamily: fonts.regular,
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
      {suggested && onAccept ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${acceptLabel ?? "Accept"}: ${label}`}
          onPress={onAccept}
          hitSlop={6}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={{ color: tokens.accent, fontSize: 14, lineHeight: 18, fontFamily: fonts.medium }}>+</Text>
        </Pressable>
      ) : null}
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${removeLabel ?? "Remove"}: ${label}`}
          onPress={onRemove}
          hitSlop={6}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={{ color: tokens.textTertiary, fontSize: 14, lineHeight: 18, fontFamily: fonts.medium }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  actionBtn: {
    paddingHorizontal: 2,
  },
});
