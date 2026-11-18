import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, GitMerge, Pencil, Trash2 } from "lucide-react-native";
import type { Tag } from "@inbox/api-client";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import { getApiClient } from "../../src/api";
import { Button } from "../../src/components/Button";
import { Dialog } from "../../src/components/Dialog";
import { Input } from "../../src/components/Field";
import { useToast } from "../../src/components/Toast";

/** S9 — tags: count, origin, rename/merge (M5), delete (M6). */
export default function TagsTab() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set());
  const [renameTag, setRenameTag] = useState<Tag | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const { data: tags, isPending } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });
  const { data: counts } = useQuery({
    queryKey: ["tag-counts"],
    queryFn: async () => {
      const page = await api.listItems({ limit: 1000 });
      const map: Record<string, number> = {};
      for (const item of page.items) {
        const names = new Set([...item.userTags, ...item.suggestedTags, ...item.ai.tags]);
        for (const n of names) map[n] = (map[n] ?? 0) + 1;
      }
      return map;
    },
  });

  const sortedTags = useMemo(
    () => [...(tags ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [tags],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["tag-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["item"] });
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameTag(id, name),
    onSuccess: () => {
      invalidate();
      setRenameTag(null);
      toast.toast({ variant: "success", message: t("tags.renamed") });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const sources = [...mergeSelection].filter((tid) => tid !== mergeTarget);
      await api.mergeTags(sources, mergeTarget);
    },
    onSuccess: () => {
      invalidate();
      setMergeOpen(false);
      setMergeSelection(new Set());
      setMergeTarget("");
      toast.toast({ variant: "success", message: t("tags.merged") });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  const selectedTags = sortedTags.filter((tag) => mergeSelection.has(tag.id));

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 }}>
          {t("tags.title")}
        </Text>
        <Button
          size="sm"
          variant="secondary"
          label={t("common.merge")}
          icon={<GitMerge size={14} color={tokens.text} strokeWidth={1.5} />}
          disabled={mergeSelection.size < 2}
          onPress={() => {
            setMergeTarget([...mergeSelection][0]);
            setMergeOpen(true);
          }}
        />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : sortedTags.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: "center" }}>
            {t("tags.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}>
          {/* Column captions */}
          <View style={[styles.row, styles.headerCells]}>
            <View style={styles.checkCell} />
            <Text style={[styles.cellText, { flex: 1, color: tokens.textTertiary, fontFamily: fonts.medium }]}>
              {t("tags.columnTag")}
            </Text>
            <Text style={[styles.cellText, styles.countCell, { color: tokens.textTertiary, fontFamily: fonts.medium }]}>
              {t("tags.columnCount")}
            </Text>
            <Text style={[styles.cellText, styles.originCell, { color: tokens.textTertiary, fontFamily: fonts.medium }]}>
              {t("tags.columnOrigin")}
            </Text>
            <View style={styles.actionsCell} />
          </View>

          {sortedTags.map((tag) => {
            const checked = mergeSelection.has(tag.id);
            return (
              <View
                key={tag.id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: tokens.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    backgroundColor: checked ? tokens.accentSubtle : "transparent",
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${t("common.merge")}: ${tag.name}`}
                  onPress={() =>
                    setMergeSelection((prev) => {
                      const next = new Set(prev);
                      if (next.has(tag.id)) next.delete(tag.id);
                      else next.add(tag.id);
                      return next;
                    })
                  }
                  hitSlop={6}
                  style={[
                    styles.checkbox,
                    styles.checkCell,
                    {
                      borderColor: checked ? tokens.accent : tokens.borderStrong,
                      backgroundColor: checked ? tokens.accent : "transparent",
                    },
                  ]}
                >
                  {checked ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tag.name}
                  onPress={() => router.push({ pathname: "/(tabs)/search", params: { q: tag.name } })}
                  style={{ flex: 1, paddingVertical: 12 }}
                >
                  <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14 }}>
                    {tag.name}
                  </Text>
                </Pressable>

                <Text
                  style={[
                    styles.cellText,
                    styles.countCell,
                    { color: tokens.textSecondary, fontFamily: fonts.regular, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {counts?.[tag.name] ?? 0}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.cellText, styles.originCell, { color: tokens.textTertiary, fontFamily: fonts.regular }]}
                >
                  {tag.origin === "user" ? t("tags.originUser") : t("tags.originAi")}
                </Text>

                <View style={styles.actionsCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("common.rename")}: ${tag.name}`}
                    onPress={() => {
                      setRenameTag(tag);
                      setRenameValue(tag.name);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Pencil size={14} color={tokens.textSecondary} strokeWidth={1.5} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("common.delete")}: ${tag.name}`}
                    onPress={() => setDeleteTarget(tag)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Trash2 size={14} color={tokens.danger} strokeWidth={1.5} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* M5 — rename */}
      <Dialog
        visible={renameTag !== null}
        title={t("tags.renameTitle")}
        onClose={() => setRenameTag(null)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setRenameTag(null)} />
            <Button
              variant="primary"
              label={t("common.rename")}
              disabled={!renameValue.trim() || renameMutation.isPending}
              onPress={() => renameTag && renameMutation.mutate({ id: renameTag.id, name: renameValue.trim() })}
            />
          </>
        }
      >
        <Input
          autoFocus
          value={renameValue}
          onChangeText={setRenameValue}
          onSubmitEditing={() =>
            renameTag && renameValue.trim() && renameMutation.mutate({ id: renameTag.id, name: renameValue.trim() })
          }
        />
      </Dialog>

      {/* M5 — merge */}
      <Dialog
        visible={mergeOpen}
        title={t("tags.mergeTitle")}
        description={t("tags.mergeSelect")}
        onClose={() => setMergeOpen(false)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setMergeOpen(false)} />
            <Button
              variant="primary"
              label={t("common.merge")}
              disabled={!mergeTarget || mergeMutation.isPending}
              onPress={() => mergeMutation.mutate()}
            />
          </>
        }
      >
        <View style={{ gap: 6 }}>
          {selectedTags.map((tag) => (
            <Pressable
              key={tag.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: mergeTarget === tag.id }}
              onPress={() => setMergeTarget(tag.id)}
              style={[
                styles.mergeOption,
                {
                  borderRadius: radii.control,
                  borderColor: mergeTarget === tag.id ? tokens.accent : tokens.borderStrong,
                  backgroundColor: mergeTarget === tag.id ? tokens.accentSubtle : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: mergeTarget === tag.id ? tokens.accent : tokens.text,
                  fontFamily: fonts.regular,
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {tag.name}
              </Text>
              {mergeTarget === tag.id ? <Check size={14} color={tokens.accent} strokeWidth={2} /> : null}
            </Pressable>
          ))}
        </View>
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12 }}>
          {t("tags.mergeTarget")}
        </Text>
      </Dialog>

      {/* M6 — delete tag */}
      <Dialog
        visible={deleteTarget !== null}
        title={t("tags.deleteTitle")}
        description={t("tags.deleteBody")}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setDeleteTarget(null)} />
            <Button
              variant="danger"
              label={t("common.delete")}
              onPress={() => {
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target) {
                  void api.deleteTag(target.id).then(() => {
                    invalidate();
                    toast.toast({ variant: "success", message: t("tags.deleted") });
                  });
                }
              }}
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 2,
  },
  headerCells: {
    minHeight: 32,
  },
  cellText: {
    fontSize: 12,
  },
  checkCell: { width: 28 },
  countCell: { width: 44, textAlign: "right" },
  originCell: { width: 72 },
  actionsCell: { flexDirection: "row", width: 64, justifyContent: "flex-end", gap: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: { padding: 6 },
  mergeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
