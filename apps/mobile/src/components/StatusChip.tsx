import { StyleSheet, Text, View } from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Inbox as InboxIcon,
  PenLine,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ItemStatus } from "@inbox/api-client";
import { rgba, statusMeta } from "@inbox/ui-core";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

const icons: Record<string, LucideIcon> = {
  inbox: InboxIcon,
  download: Download,
  "pen-line": PenLine,
  "check-circle": CheckCircle2,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
};

/**
 * Status chip: always icon + plain text, never colour alone (WCAG rule from
 * the web design system). Pass `label` from i18n: t(statusLabelKey(status)).
 */
export function StatusChip({
  status,
  label,
  size = 14,
}: {
  status: ItemStatus;
  label: string;
  size?: number;
}) {
  const { tokens } = useTheme();
  const meta = statusMeta(status);
  const Icon = icons[meta.icon];

  const color =
    meta.tone === "success"
      ? tokens.success
      : meta.tone === "warning"
        ? tokens.warning
        : meta.tone === "danger"
          ? tokens.danger
          : tokens.textSecondary;

  const borderColor =
    meta.tone === "success"
      ? rgba(tokens.successRgb, 0.4)
      : meta.tone === "warning"
        ? rgba(tokens.warningRgb, 0.4)
        : meta.tone === "danger"
          ? rgba(tokens.dangerRgb, 0.4)
          : tokens.borderStrong;

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.chip,
        { borderRadius: radii.control, borderColor, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {Icon ? <Icon size={size} color={color} strokeWidth={1.5} /> : null}
      <Text style={{ color, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
  },
});
