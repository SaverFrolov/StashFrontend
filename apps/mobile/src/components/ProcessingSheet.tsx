import { forwardRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  RotateCcw,
  SkipForward,
} from "lucide-react-native";
import type { Item } from "@inbox/api-client";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { formatDateTime } from "../lib/format";

const stepIcon = {
  pending: Clock,
  running: CircleDashed,
  ok: CheckCircle2,
  failed: AlertTriangle,
  skipped: SkipForward,
} as const;

/** M8 — processing details bottom sheet: steps, timestamps, errors, Retry. */
export const ProcessingSheet = forwardRef<
  BottomSheetModal,
  { item: Item | null; onRetry?: (item: Item) => void }
>(function ProcessingSheet({ item, onRetry }, ref) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const statusKey = (s: string) =>
    s === "pending"
      ? "item.stepPending"
      : s === "running"
        ? "item.stepRunning"
        : s === "ok"
          ? "item.stepOk"
          : s === "failed"
            ? "item.stepFailed"
            : "item.stepSkipped";

  const hasFailed = item?.processing.some((s) => s.status === "failed") ?? false;

  return (
    <Sheet ref={ref} title={t("modals.processingTitle")} snapPoints={["45%", "75%"]}>
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
        {(item?.processing ?? []).map((step, i) => {
          const Icon = stepIcon[step.status];
          const color =
            step.status === "ok"
              ? tokens.success
              : step.status === "failed"
                ? tokens.danger
                : tokens.textSecondary;
          return (
            <View
              key={`${step.name}-${i}`}
              style={[
                styles.step,
                { borderColor: tokens.glassBorder, borderRadius: radii.control, backgroundColor: tokens.surfaceSubtle },
              ]}
            >
              <Icon size={17} color={color} strokeWidth={1.5} />
              <View style={styles.stepBody}>
                <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 }}>
                  {step.name === "extract" ? t("item.stepExtract") : t("item.stepAnnotate")}
                </Text>
                <Text style={{ color, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
                  {t(statusKey(step.status))}
                </Text>
                {step.startedAt ? (
                  <Text
                    style={{
                      color: tokens.textTertiary,
                      fontFamily: fonts.regular,
                      fontSize: 11,
                      lineHeight: 16,
                      marginTop: 2,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatDateTime(step.startedAt)}
                    {step.finishedAt ? ` → ${formatDateTime(step.finishedAt)}` : ""}
                  </Text>
                ) : null}
                {step.error ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={tokens.danger} strokeWidth={1.5} />
                    <Text style={{ color: tokens.danger, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, flex: 1 }}>
                      {step.error}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}

        {hasFailed && item && onRetry ? (
          <Button
            variant="secondary"
            label={t("common.retry")}
            icon={<RotateCcw size={16} color={tokens.text} strokeWidth={1.5} />}
            onPress={() => onRetry(item)}
          />
        ) : null}
      </ScrollView>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  step: {
    flexDirection: "row",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  stepBody: {
    flex: 1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 6,
  },
});
