import { Platform, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { motion } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { SegmentedFilter } from "./SegmentedFilter";
import type { SegmentOption } from "./SegmentedFilter";

void motion; // timing constants live in the screen's scroll worklet (220ms ease-out)

const BAND_HEIGHT = 52; // web parity: py-2 (8+8) + 36dp control — constant in both states

/**
 * Condensing filter bar (web parity, mobile form-factor = the web <1024px
 * "compact sticky row"): the band keeps a CONSTANT height so there is no
 * layout shift and no scroll-height feedback loop; the full and compact rows
 * cross-fade with opacity+scale only (transform/opacity, 220ms ease-out is
 * driven by the screen's animated scroll handler with 80/24 hysteresis).
 */
export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  progress,
  condensed,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 0 = full row, 1 = compact row (animated by the screen) */
  progress: SharedValue<number>;
  /** mirrored React state of `progress` target — switches pointer events */
  condensed: boolean;
}) {
  const { t } = useTranslation();
  const { tokens, theme } = useTheme();

  const fullStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.97]) }],
  }));
  const compactStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.97, 1]) }],
  }));

  return (
    <View
      style={[
        styles.band,
        {
          borderBottomColor: tokens.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <BlurView
        tint={theme === "dark" ? "dark" : "light"}
        intensity={80}
        experimentalBlurMethod={Platform.OS === "android" ? "none" : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.surface }]} />

      <Animated.View
        pointerEvents={condensed ? "none" : "auto"}
        style={[styles.layer, fullStyle]}
      >
        <SegmentedFilter
          options={options}
          value={value}
          onChange={onChange}
          ariaLabel={t("feed.filterAll")}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={condensed ? "auto" : "none"}
        style={[styles.layer, compactStyle]}
      >
        <SegmentedFilter
          options={options}
          value={value}
          onChange={onChange}
          ariaLabel={t("feed.filterAll")}
          compact
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    height: BAND_HEIGHT,
    justifyContent: "center",
    overflow: "hidden",
  },
  layer: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
