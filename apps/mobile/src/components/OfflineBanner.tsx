import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { radii, rgba } from "@inbox/ui-core";
import { useTranslation } from "react-i18next";
import { fonts, useTheme } from "../theme/ThemeProvider";

/** Global offline banner (S12 / composer parity): visible whenever offline. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  if (netInfo.isConnected !== false) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
      <View
        style={[
          styles.banner,
          {
            backgroundColor: tokens.surface,
            borderColor: rgba(tokens.warningRgb, 0.4),
            borderRadius: radii.control,
          },
        ]}
      >
        <WifiOff size={14} color={tokens.warning} strokeWidth={1.5} />
        <Text
          numberOfLines={2}
          style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, flex: 1 }}
        >
          {t("system.offlineTitle")} — {t("system.offlineBody")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 90,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 420,
    width: "100%",
  },
});
