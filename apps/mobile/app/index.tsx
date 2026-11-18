import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { ItemStatus } from "@inbox/api-client";
import { APP_NAME } from "@inbox/api-client";
import { statusLabelKey } from "@inbox/ui-core";
import { fonts, useTheme } from "../src/theme/ThemeProvider";
import type { ThemeMode } from "../src/theme/ThemeProvider";
import { setAppLanguage } from "../src/i18n";
import { GlassSurface } from "../src/components/GlassSurface";
import { Button } from "../src/components/Button";
import { Chip, TagChip } from "../src/components/Chip";
import { StatusChip } from "../src/components/StatusChip";
import { SegmentedFilter } from "../src/components/SegmentedFilter";
import { useToast } from "../src/components/Toast";
import { Dialog } from "../src/components/Dialog";
import { ActionMenu } from "../src/components/ActionMenu";
import { Sheet } from "../src/components/Sheet";

const DEMO_STATUSES: ItemStatus[] = ["saved", "extracting", "annotating", "done", "partial", "extraction_failed", "ai_failed"];

/**
 * Phase 2 foundation showcase (temporary). Exercises every primitive,
 * both themes and both locales; replaced by the auth flow in Phase 3.
 */
export default function FoundationScreen() {
  const { t, i18n } = useTranslation();
  const { tokens, theme, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [userTags, setUserTags] = useState<string[]>(["recipes"]);
  const [suggested, setSuggested] = useState<string[]>(["pasta", "italian"]);

  const sectionTitle = (text: string) => (
    <Text style={{ color: tokens.textTertiary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, marginBottom: 8 }}>
      {text.toUpperCase()}
    </Text>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34 }}>{APP_NAME}</Text>
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          mobile foundation — phase 2
        </Text>
      </View>

      {/* Theme */}
      <View>
        {sectionTitle(t("common.theme"))}
        <SegmentedFilter
          ariaLabel={t("common.theme")}
          value={mode}
          onChange={(v) => setMode(v as ThemeMode)}
          options={[
            { value: "system", label: t("shell.themeSystem") },
            { value: "light", label: t("shell.themeLight") },
            { value: "dark", label: t("shell.themeDark") },
          ]}
        />
      </View>

      {/* Language */}
      <View>
        {sectionTitle(t("common.language"))}
        <View style={styles.row}>
          {(["ru", "en"] as const).map((lng) => (
            <Chip
              key={lng}
              label={lng === "ru" ? "Русский" : "English"}
              active={i18n.resolvedLanguage === lng}
              onPress={() => setAppLanguage(lng)}
            />
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View>
        {sectionTitle("Buttons")}
        <View style={styles.col}>
          <Button variant="primary" label={t("common.save")} fullWidth />
          <View style={styles.row}>
            <Button variant="secondary" label={t("common.cancel")} />
            <Button variant="ghost" label={t("common.edit")} />
            <Button variant="danger" label={t("common.delete")} />
          </View>
          <View style={styles.row}>
            <Button variant="primary" size="sm" label={t("common.loading")} loading />
            <Button variant="secondary" size="sm" label={t("common.save")} disabled />
          </View>
        </View>
      </View>

      {/* Status chips */}
      <View>
        {sectionTitle("Statuses")}
        <GlassSurface style={{ borderRadius: 14, padding: 12 }} fallback>
          <View style={styles.wrap}>
            {DEMO_STATUSES.map((s) => (
              <StatusChip key={s} status={s} label={t(statusLabelKey(s))} />
            ))}
          </View>
        </GlassSurface>
      </View>

      {/* Tags */}
      <View>
        {sectionTitle(t("item.tags"))}
        <View style={styles.wrap}>
          {userTags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              onRemove={() => setUserTags((prev) => prev.filter((x) => x !== tag))}
              removeLabel={t("item.removeTag")}
            />
          ))}
          {suggested.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              suggested
              onAccept={() => {
                setSuggested((prev) => prev.filter((x) => x !== tag));
                setUserTags((prev) => [...new Set([...prev, tag])]);
              }}
              onRemove={() => setSuggested((prev) => prev.filter((x) => x !== tag))}
              acceptLabel={t("item.acceptTag")}
              removeLabel={t("item.removeTag")}
            />
          ))}
        </View>
      </View>

      {/* Toasts */}
      <View>
        {sectionTitle("Toasts")}
        <View style={styles.row}>
          <Button
            size="sm"
            variant="secondary"
            label="success"
            onPress={() => toast.toast({ variant: "success", message: t("modals.uploadDone") })}
          />
          <Button
            size="sm"
            variant="secondary"
            label="error"
            onPress={() => toast.toast({ variant: "error", message: t("common.errorGeneric") })}
          />
          <Button
            size="sm"
            variant="secondary"
            label="undo"
            onPress={() =>
              toast.toast({
                variant: "undo",
                message: t("item.deletedUndo"),
                undoLabel: t("common.undo"),
                onUndo: () => toast.toast({ variant: "success", message: t("common.undo") }),
              })
            }
          />
        </View>
      </View>

      {/* Dialog / ActionMenu / Sheet */}
      <View>
        {sectionTitle("Overlays")}
        <View style={styles.row}>
          <Button size="sm" variant="secondary" label={t("modals.confirmDeleteTitle")} onPress={() => setDialogOpen(true)} />
          <Button size="sm" variant="secondary" label={t("modals.processingTitle")} onPress={() => sheetRef.current?.present()} />
          <ActionMenu
            items={[
              { key: "reprocess", label: t("item.reprocess"), onSelect: () => toast.toast({ variant: "success", message: t("item.reprocess") }) },
              { key: "delete", label: t("common.delete"), danger: true, onSelect: () => toast.toast({ variant: "undo", message: t("item.deletedUndo"), undoLabel: t("common.undo"), onUndo: () => undefined }) },
            ]}
            trigger={(open) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("item.reprocess")}
                onPress={open}
                style={({ pressed }) => [
                  styles.dotsBtn,
                  { borderColor: tokens.glassBorder, backgroundColor: tokens.surface, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MoreHorizontal size={18} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            )}
          />
        </View>
      </View>

      <Dialog
        visible={dialogOpen}
        title={t("modals.confirmDeleteTitle")}
        description={t("modals.confirmDeleteBody")}
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setDialogOpen(false)} />
            <Button
              variant="danger"
              label={t("common.delete")}
              onPress={() => {
                setDialogOpen(false);
                toast.toast({ variant: "undo", message: t("item.deletedUndo"), undoLabel: t("common.undo"), onUndo: () => undefined });
              }}
            />
          </>
        }
      />

      <Sheet ref={sheetRef} title={t("modals.processingTitle")} snapPoints={["40%", "70%"]}>
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          {t("item.processingDetails")} — sheet body placeholder (Phase 5).
        </Text>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  col: {
    gap: 8,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dotsBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
