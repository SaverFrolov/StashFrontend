import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { fonts, useTheme } from "../src/theme/ThemeProvider";

/** S12: 404 (web parity). */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={{ color: tokens.textTertiary, fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34 }}>404</Text>
      <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 }}>
        {t("system.notFoundTitle")}
      </Text>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.regular }]}>
        {t("system.notFoundBody")}
      </Text>
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: tokens.accent }, pressed && { opacity: 0.85 }]}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: fonts.medium, fontSize: 14 }}>{t("system.goInbox")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
