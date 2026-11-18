import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, useTheme } from "../src/theme/ThemeProvider";
import { useAuth } from "../src/state/AuthContext";

/** S11 — replaced by the real quick capture (incl. share intent) in Phase 6. */
export default function CaptureRoute() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, ready } = useAuth();

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
      >
        <X size={20} color={tokens.textSecondary} strokeWidth={1.5} />
      </Pressable>
      <View style={styles.center}>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 }}>
          {t("capture.title")}
        </Text>
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
          S11 — Phase 6
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  close: {
    alignSelf: "flex-start",
    padding: 8,
    marginTop: -8,
    marginLeft: -8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
