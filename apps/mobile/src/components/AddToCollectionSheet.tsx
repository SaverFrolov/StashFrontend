import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search } from "lucide-react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { useToast } from "./Toast";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Input } from "./Field";

export interface AddToCollectionSheetHandle {
  open: (itemIds: string[]) => void;
}

/**
 * M2 — Add to collection bottom sheet: search field, checkbox list,
 * "Create collection '...'" row (creates and adds in one step).
 */
export const AddToCollectionSheet = forwardRef<AddToCollectionSheetHandle>(
  function AddToCollectionSheet(_props, ref) {
    const { t } = useTranslation();
    const { tokens } = useTheme();
    const api = getApiClient();
    const toast = useToast();
    const queryClient = useQueryClient();

    const sheetRef = useRef<BottomSheetModal>(null);
    const [itemIds, setItemIds] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useImperativeHandle(ref, () => ({
      open: (ids: string[]) => {
        setItemIds(ids);
        setSelected(new Set());
        setQuery("");
        sheetRef.current?.present();
      },
    }));

    const { data: collections } = useQuery({
      queryKey: ["collections"],
      queryFn: () => api.listCollections(),
    });

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      const list = collections ?? [];
      return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
    }, [collections, query]);

    const exactMatch = useMemo(
      () => (collections ?? []).some((c) => c.name.toLowerCase() === query.trim().toLowerCase()),
      [collections, query],
    );

    const apply = useMutation({
      mutationFn: async () => {
        for (const cid of selected) {
          await api.addToCollection(itemIds, cid);
        }
        if (query.trim() && !exactMatch) {
          const col = await api.createCollection(query.trim());
          await api.addToCollection(itemIds, col.id);
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["collections"] });
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        void queryClient.invalidateQueries({ queryKey: ["item"] });
        toast.toast({ variant: "success", message: t("modals.addToCollectionTitle") });
        sheetRef.current?.dismiss();
      },
      onError: () => {
        toast.toast({ variant: "error", message: t("common.errorGeneric") });
      },
    });

    const canApply = selected.size > 0 || (query.trim().length > 0 && !exactMatch);

    return (
      <Sheet ref={sheetRef} title={t("modals.addToCollectionTitle")} snapPoints={["55%", "85%"]}>
        <View style={styles.searchRow}>
          <Search size={16} color={tokens.textTertiary} strokeWidth={1.5} />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t("modals.collectionSearch")}
            style={styles.searchInput}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.trim() ? undefined : (
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 12, textAlign: "center" }}>
                {t("modals.noCollections")}
              </Text>
            )
          }
          renderItem={({ item: c }) => {
            const checked = selected.has(c.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: tokens.surfaceSubtle }]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderRadius: radii.control - 4,
                      borderColor: checked ? tokens.accent : tokens.borderStrong,
                      backgroundColor: checked ? tokens.accent : "transparent",
                    },
                  ]}
                >
                  {checked ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 15, flex: 1 }}>
                  {c.name}
                </Text>
              </Pressable>
            );
          }}
        />

        {query.trim() && !exactMatch ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => apply.mutate()}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Plus size={16} color={tokens.accent} strokeWidth={1.5} />
            <Text numberOfLines={1} style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 14, flex: 1 }}>
              {t("modals.createCollectionRow", { name: query.trim() })}
            </Text>
          </Pressable>
        ) : null}

        <Button
          variant="primary"
          label={t("common.save")}
          disabled={!canApply}
          loading={apply.isPending}
          onPress={() => apply.mutate()}
          fullWidth
        />
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
