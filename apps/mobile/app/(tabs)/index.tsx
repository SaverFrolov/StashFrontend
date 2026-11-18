import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink, FolderPlus, RefreshCcw, Trash2, X } from "lucide-react-native";
import type { Item } from "@inbox/api-client";
import { condenseThresholds, motion, radii, rgba } from "@inbox/ui-core";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import { getApiClient } from "../../src/api";
import { useInboxFeed } from "../../src/hooks/useInboxFeed";
import type { FeedFilter } from "../../src/hooks/useInboxFeed";
import { FilterBar } from "../../src/components/FilterBar";
import { ItemCard } from "../../src/components/ItemCard";
import { Composer } from "../../src/components/Composer";
import { AddToCollectionSheet } from "../../src/components/AddToCollectionSheet";
import type { AddToCollectionSheetHandle } from "../../src/components/AddToCollectionSheet";
import type { ActionMenuItem } from "../../src/components/ActionMenu";
import { Dialog } from "../../src/components/Dialog";
import { Button } from "../../src/components/Button";
import { GlassSurface } from "../../src/components/GlassSurface";
import { useToast } from "../../src/components/Toast";
import { dayKey, formatDaySeparator } from "../../src/lib/format";

type Row =
  | { kind: "date"; key: string; label: string }
  | { kind: "item"; key: string; item: Item };

/**
 * S4 Inbox feed (web parity): messenger-style inverted list, newest at the
 * bottom (live edge), date separators, upward infinite paging, segmented
 * filters with the condensing bar (Reanimated, 80/24 hysteresis, 220ms
 * ease-out, transform/opacity only), multi-select via long-press with a bulk
 * bar, composer docked at the bottom.
 */
export default function InboxTab() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FeedFilter>("all");
  const feed = useInboxFeed(filter);

  // Condensing bar state: shared value drives the cross-fade; the React flag
  // mirrors it for pointer events. Hysteresis per ui-core condenseThresholds.
  const progress = useSharedValue(0);
  const condensedFlag = useSharedValue(false);
  const [condensed, setCondensed] = useState(false);
  const reducedMotion = useReducedMotion();

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        // Inverted list: contentOffset.y is the distance from the live edge.
        const d = e.contentOffset.y;
        const duration = reducedMotion ? 0 : motion.morphMs;
        const timing = { duration, easing: Easing.out(Easing.quad) };
        if (!condensedFlag.value && d > condenseThresholds.enter) {
          condensedFlag.value = true;
          progress.value = withTiming(1, timing);
          runOnJS(setCondensed)(true);
        } else if (condensedFlag.value && d < condenseThresholds.exit) {
          condensedFlag.value = false;
          progress.value = withTiming(0, timing);
          runOnJS(setCondensed)(false);
        }
      },
    },
    [reducedMotion],
  );

  // ---- rows: dedupe, chronological asc, day separators, then reversed for the inverted list
  const { rows, itemsById } = useMemo(() => {
    const pages = feed.data?.pages ?? [];
    const all = pages.flatMap((p) => p.items);
    const seen = new Set<string>();
    const items = all
      .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
    const byId = new Map<string, Item>(items.map((i) => [i.id, i]));
    const out: Row[] = [];
    let lastDay = "";
    for (const item of items) {
      const key = dayKey(item.capturedAt);
      if (key !== lastDay) {
        out.push({
          kind: "date",
          key: `d-${key}`,
          label: formatDaySeparator(item.capturedAt, t("common.today"), t("common.yesterday")),
        });
        lastDay = key;
      }
      out.push({ kind: "item", key: item.id, item });
    }
    // data[0] renders at the bottom in an inverted list
    return { rows: out.reverse(), itemsById: byId };
  }, [feed.data, t]);

  // ---- selection ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => setSelected(new Set()), []);

  // ---- actions ----
  const addSheetRef = useRef<AddToCollectionSheetHandle>(null);
  const [reprocessTarget, setReprocessTarget] = useState<Item | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null);

  const invalidateFeed = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
  }, [queryClient]);

  const performDelete = useCallback(
    async (ids: string[]) => {
      const backup = ids.map((id) => itemsById.get(id)).filter((i): i is Item => Boolean(i));
      try {
        await api.deleteItems(ids);
        invalidateFeed();
        exitSelection();
        if (backup.length === 1) {
          const item = backup[0];
          // Single delete: immediate with an 8s Undo toast (web parity)
          toast.toast({
            variant: "undo",
            message: t("item.deletedUndo"),
            undoLabel: t("common.undo"),
            durationMs: 8000,
            onUndo: async () => {
              await api.saveText({ text: item.original.text ?? item.title, comment: item.userComment });
              invalidateFeed();
            },
          });
        }
      } catch {
        toast.toast({ variant: "error", message: t("common.errorGeneric") });
      }
    },
    [api, itemsById, invalidateFeed, exitSelection, toast, t],
  );

  const requestDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 1) {
        void performDelete(ids);
      } else {
        setDeleteTargets(ids);
      }
    },
    [performDelete],
  );

  const buildMenuItems = useCallback(
    (item: Item): ActionMenuItem[] => {
      const items: ActionMenuItem[] = [];
      if (item.source.url) {
        items.push({
          key: "open",
          label: t("item.openOriginal"),
          icon: <ExternalLink size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
          onSelect: () => void Linking.openURL(item.source.url!),
        });
      }
      items.push({
        key: "collection",
        label: t("item.addToCollection"),
        icon: <FolderPlus size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
        onSelect: () => addSheetRef.current?.open([item.id]),
      });
      items.push({
        key: "reprocess",
        label: t("item.reprocess"),
        icon: <RefreshCcw size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
        onSelect: () => setReprocessTarget(item),
      });
      items.push({
        key: "delete",
        label: t("item.deleteItem"),
        icon: <Trash2 size={16} color={tokens.danger} strokeWidth={1.5} />,
        danger: true,
        onSelect: () => requestDelete([item.id]),
      });
      return items;
    },
    [t, tokens, requestDelete],
  );

  const filterOptions = useMemo(
    () => [
      { value: "all" as FeedFilter, label: t("feed.filterAll") },
      { value: "attention" as FeedFilter, label: t("feed.filterAttention") },
      { value: "link" as FeedFilter, label: t("feed.filterLinks") },
      { value: "text" as FeedFilter, label: t("feed.filterNotes") },
      { value: "file" as FeedFilter, label: t("feed.filterFiles") },
      ...(["audio"] as FeedFilter[]).map((v) => ({ value: v, label: t("feed.filterAudio") })),
    ],
    [t],
  );

  const isEmpty = !feed.isPending && rows.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <FilterBar
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          progress={progress}
          condensed={condensed}
        />

        {/* Bulk action bar (selection mode) */}
        {selectionMode ? (
          <View style={[styles.bulkBar, { backgroundColor: tokens.accentSubtle, borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 13, fontVariant: ["tabular-nums"] }}>
              {t("feed.selected", { count: selected.size })}
            </Text>
            <View style={styles.flex1} />
            <Button size="sm" variant="secondary" label={t("feed.bulkAddToCollection")} onPress={() => addSheetRef.current?.open([...selected])} />
            <Button size="sm" variant="danger" label={t("feed.bulkDelete")} onPress={() => requestDelete([...selected])} />
            <Pressable accessibilityRole="button" accessibilityLabel={t("feed.clearSelection")} onPress={exitSelection} hitSlop={8} style={styles.clearBtn}>
              <X size={16} color={tokens.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>
        ) : null}

        {feed.isPending ? (
          <View style={styles.skeletonWrap} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: 92,
                  borderRadius: radii.card,
                  backgroundColor: tokens.surfaceSubtle,
                  marginBottom: 8,
                }}
              />
            ))}
          </View>
        ) : feed.isError ? (
          <View style={styles.center}>
            <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
              {t("feed.loadError")}
            </Text>
            <Button size="sm" variant="secondary" label={t("common.retry")} onPress={() => void feed.refetch()} />
          </View>
        ) : isEmpty ? (
          <View style={styles.center}>
            <Text style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 16, textAlign: "center" }}>
              {filter === "attention" ? t("feed.emptyAttention") : t("feed.emptyTitle")}
            </Text>
            {filter !== "attention" ? (
              <View style={{ gap: 2, marginTop: 4 }}>
                <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
                  {t("feed.emptyExample1")}
                </Text>
                <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
                  {t("feed.emptyExample2")}
                </Text>
                <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
                  {t("feed.emptyExample3")}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Animated.FlatList
            inverted
            data={rows}
            keyExtractor={(row) => row.key}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}
            // In an inverted list the footer renders at the visual top (older side)
            ListFooterComponent={
              feed.isFetchingNextPage ? (
                <View style={styles.loadingOlder}>
                  <ActivityIndicator size="small" color={tokens.accent} />
                  <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12 }}>
                    {t("feed.loadingOlder")}
                  </Text>
                </View>
              ) : undefined
            }
            renderItem={({ item: row }: { item: Row }) => {
              if (row.kind === "date") {
                return (
                  <View style={styles.dateRow}>
                    <View
                      style={[
                        styles.datePill,
                        {
                          borderRadius: radii.control,
                          backgroundColor: tokens.surface,
                          borderColor: rgba(tokens.accentRgb, 0.4),
                        },
                      ]}
                    >
                      <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 }}>
                        {row.label}
                      </Text>
                    </View>
                  </View>
                );
              }
              return (
                <ItemCard
                  item={row.item}
                  selectionMode={selectionMode}
                  selected={selected.has(row.item.id)}
                  menuItems={buildMenuItems}
                  onPress={(item) => {
                    if (selectionMode) toggleSelect(item.id);
                    else router.push(`/items/${item.id}`);
                  }}
                  onLongPress={(item) => {
                    setSelected((prev) => new Set(prev).add(item.id));
                  }}
                />
              );
            }}
          />
        )}

        <Composer />
      </View>

      <AddToCollectionSheet ref={addSheetRef} />

      {/* M9 — reprocess confirmation (what is replaced / untouched) */}
      <Dialog
        visible={reprocessTarget !== null}
        title={t("modals.reprocessTitle")}
        description={t("modals.reprocessBody")}
        onClose={() => setReprocessTarget(null)}
      >
        <GlassSurface fallback style={{ borderRadius: radii.control, padding: 12 }}>
          <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>
            {t("modals.reprocessReplaced")}
          </Text>
        </GlassSurface>
        <GlassSurface fallback style={{ borderRadius: radii.control, padding: 12 }}>
          <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>
            {t("modals.reprocessUntouched")}
          </Text>
        </GlassSurface>
        <View style={styles.dialogFooter}>
          <Button variant="ghost" label={t("common.cancel")} onPress={() => setReprocessTarget(null)} />
          <Button
            variant="primary"
            label={t("item.reprocess")}
            onPress={() => {
              const target = reprocessTarget;
              setReprocessTarget(null);
              if (target) {
                void api.reprocessItem(target.id).then(invalidateFeed);
              }
            }}
          />
        </View>
      </Dialog>

      {/* M6 — bulk delete confirmation */}
      <Dialog
        visible={deleteTargets !== null}
        title={t("modals.confirmBulkDeleteTitle", { count: deleteTargets?.length ?? 0 })}
        description={t("modals.confirmDeleteBody")}
        onClose={() => setDeleteTargets(null)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setDeleteTargets(null)} />
            <Button
              variant="danger"
              label={t("common.delete")}
              onPress={() => {
                const ids = deleteTargets;
                setDeleteTargets(null);
                if (ids) void performDelete(ids);
              }}
            />
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  skeletonWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
  },
  dateRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  datePill: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  loadingOlder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  dialogFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
});
