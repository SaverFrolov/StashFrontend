import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { fonts, useTheme } from "../theme/ThemeProvider";

/**
 * Glass screen header for stack routes: back chevron + title + right actions.
 * Sticky at the top; blur is allowed here (large layer per the blur budget).
 */
export function ScreenHeader({
  title,
  right,
  showBack = true,
}: {
  title?: string;
  right?: ReactNode;
  showBack?: boolean;
}) {
  const { t } = useTranslation();
  const { tokens, theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View
      style={[
        styles.wrap,
        { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <BlurView
        tint={theme === "dark" ? "dark" : "light"}
        intensity={80}
        experimentalBlurMethod={Platform.OS === "android" ? "none" : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.surface }]} />
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : undefined)}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={22} color={tokens.text} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text numberOfLines={1} style={{ flex: 1, color: tokens.text, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 }}>
          {title}
        </Text>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  backPlaceholder: {
    width: 8,
  },
});
