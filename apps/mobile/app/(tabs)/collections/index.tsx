import { useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Folder, Plus } from "lucide-react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../../../src/theme/ThemeProvider";
import { getApiClient } from "../../../src/api";
import { Button } from "../../../src/components/Button";
import { CollectionFormSheet } from "../../../src/components/CollectionFormSheet";
import type { CollectionFormSheetHandle } from "../../../src/components/CollectionFormSheet";
import { formatDate } from "../../../src/lib/format";

/** S7 — collections list (rows, not a card grid; web parity). */
export default function CollectionsTab() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = getApiClient();
  const formRef = useRef<CollectionFormSheetHandle>(null);

  const { data: collections, isPending, isError, refetch } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.listCollections(),
  });
  const { data: counts } = useQuery({
    queryKey: ["collection-counts"],
    queryFn: async () => {
      const page = await api.listItems({ limit: 1000 });
      const map: Record<string, number> = {};
      for (const item of page.items) {
        for (const cid of item.collectionIds) map[cid] = (map[cid] ?? 0) + 1;
      }
      return map;
    },
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 }}>
          {t("collections.title")}
        </Text>
        <Button
          size="md"
          variant="primary"
          label={t("collections.newCollection")}
          icon={<Plus size={16} color="#FFFFFF" strokeWidth={1.5} />}
          onPress={() => formRef.current?.open()}
        />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
            {t("common.errorGeneric")}
          </Text>
          <Button size="sm" variant="secondary" label={t("common.retry")} onPress={() => void refetch()} />
        </View>
      ) : (collections ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: "center" }}>
            {t("collections.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, gap: 8 }}>
          {(collections ?? []).map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              onPress={() => router.push(`/collections/${c.id}`)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderRadius: radii.card,
                  backgroundColor: tokens.surface,
                  borderColor: tokens.glassBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Folder size={18} color={tokens.textTertiary} strokeWidth={1.5} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 }}>
                  {c.name}
                </Text>
                {c.description ? (
                  <Text numberOfLines={1} style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
                    {c.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.rowMeta}>
                <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                  {formatDate(c.updatedAt)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <CollectionFormSheet ref={formRef} />
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
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBody: { flex: 1 },
  rowMeta: { alignItems: "flex-end", gap: 2 },
});
