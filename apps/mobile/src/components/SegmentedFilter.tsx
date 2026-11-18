import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { radii, touchTargets } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedFilterProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Lower height and tighter padding (web compact parity); targets stay >= 32dp */
  compact?: boolean;
}

/** Single-row segmented control (S4 filters, S6 search modes). */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  compact,
}: SegmentedFilterProps<T>) {
  const { tokens } = useTheme();
  const optionHeight = touchTargets.compactMin; // 32dp — spec minimum for compact mode

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      style={[
        styles.container,
        {
          borderRadius: radii.control,
          borderColor: tokens.border,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: tokens.surfaceSubtle,
          padding: compact ? 2 : 4,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  height: optionHeight,
                  borderRadius: 4,
                  paddingHorizontal: compact ? 10 : 12,
                  backgroundColor: selected ? tokens.surface : "transparent",
                  borderColor: selected ? tokens.border : "transparent",
                  borderWidth: selected ? StyleSheet.hairlineWidth : 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: selected ? tokens.text : tokens.textSecondary,
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
  },
});
