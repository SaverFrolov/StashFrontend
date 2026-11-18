import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../../../src/theme/ThemeProvider";
import { getApiClient } from "../../../src/api";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { Button } from "../../../src/components/Button";
import { Dialog } from "../../../src/components/Dialog";
import { SegmentedFilter } from "../../../src/components/SegmentedFilter";
import { CollectionFormSheet } from "../../../src/components/CollectionFormSheet";
import type { CollectionFormSheetHandle } from "../../../src/components/CollectionFormSheet";
import { ActionMenu } from "../../../src/components/ActionMenu";
import { useToast } from "../../../src/components/Toast";
import { formatDate } from "../../../src/lib/format";

/** S8 — collection detail: sort, remove-from-collection, edit (M3), delete (M6). */
export default function CollectionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<CollectionFormSheetHandle>(null);

  const [sort, setSort] = useState<"recent" | "title">("recent");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: collection, isPending } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => api.getCollection(id!),
    enabled: Boolean(id),
  });

  const { data: items, isFetching } = useQuery({
    queryKey: ["collection-items", id],
    queryFn: async () => {
      const page = await api.listItems({ limit: 1000 });
      return page.items.filter((i) => i.collectionIds.includes(id!));
    },
    enabled: Boolean(id),
  });

  const sorted = useMemo(
    () =>
      [...(items ?? [])].sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title)
          : new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    [items, sort],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["collection-items", id] });
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
    void queryClient.invalidateQueries({ queryKey: ["collection", id] });
    void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.removeFromCollection([itemId], id!);
      invalidate();
      toast.toast({ variant: "success", message: t("collections.removedFrom") });
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    }
  };

  if (isPending || !collection) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={collection.name}
        right={
          <ActionMenu
            items={[
              {
                key: "edit",
                label: t("common.edit"),
                icon: <Pencil size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
                onSelect: () => formRef.current?.open(collection),
              },
              {
                key: "delete",
                label: t("common.delete"),
                icon: <Trash2 size={16} color={tokens.danger} strokeWidth={1.5} />,
                danger: true,
                onSelect: () => setDeleteOpen(true),
              },
            ]}
            trigger={(open) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.edit")}
                onPress={open}
                hitSlop={6}
                style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
              >
                <MoreHorizontal size={18} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            )}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}>
        {collection.description ? (
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
            {collection.description}
          </Text>
        ) : null}
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, fontVariant: ["tabular-nums"] }}>
          {t("common.itemsCount", { count: sorted.length })} · {t("collections.updated")}: {formatDate(collection.updatedAt)}
        </Text>

        <SegmentedFilter
          ariaLabel={t("collections.sortLabel")}
          value={sort}
          onChange={(v) => setSort(v as "recent" | "title")}
          compact
          options={[
            { value: "recent", label: t("collections.sortRecent") },
            { value: "title", label: t("collections.sortTitle") },
          ]}
        />

        {isFetching && sorted.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : sorted.length === 0 ? (
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: "center", paddingVertical: 24 }}>
            {t("collections.empty")}
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {sorted.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  { borderRadius: radii.card, backgroundColor: tokens.surface, borderColor: tokens.glassBorder },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => router.push(`/items/${item.id}`)}
                  style={({ pressed }) => [styles.itemBody, pressed && { opacity: 0.7 }]}
                >
                  <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                    {formatDate(item.capturedAt)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("collections.removeFromCollection")}: ${item.title}`}
                  onPress={() => void removeItem(item.id)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                >
                  <X size={15} color={tokens.textTertiary} strokeWidth={1.5} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CollectionFormSheet ref={formRef} />

      {/* M6 — delete collection (items stay in Inbox) */}
      <Dialog
        visible={deleteOpen}
        title={t("collections.deleteTitle")}
        description={t("collections.deleteBody")}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setDeleteOpen(false)} />
            <Button
              variant="danger"
              label={t("common.delete")}
              onPress={() => {
                setDeleteOpen(false);
                void api.deleteCollection(id!).then(() => {
                  void queryClient.invalidateQueries({ queryKey: ["collections"] });
                  void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
                  router.back();
                });
              }}
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 10 },
  headerBtn: { padding: 8, margin: -4, borderRadius: 8 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingRight: 8,
  },
  itemBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  removeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
});
