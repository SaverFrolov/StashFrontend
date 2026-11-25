import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Filter, Mic, Paperclip, Search as SearchIcon, X } from "lucide-react-native";
import type { Item, ItemType, SearchFilters, SearchMode, SearchResult } from "@inbox/api-client";
import { features } from "@inbox/api-client";
import { radii, rgba, statusLabelKey } from "@inbox/ui-core";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import { getApiClient } from "../../src/api";
import { Chip } from "../../src/components/Chip";
import { StatusChip } from "../../src/components/StatusChip";
import { GlassSurface } from "../../src/components/GlassSurface";
import { Button } from "../../src/components/Button";
import { SegmentedFilter } from "../../src/components/SegmentedFilter";
import { formatDate } from "../../src/lib/format";

type TypeFilter = ItemType | "any" | "file";

/** Highlights query words (len > 2) with nested accent-background Text runs (web <mark> parity). */
function Highlighted({ text, query }: { text: string; query: string }) {
  const { tokens } = useTheme();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 2).map((w) => w.toLowerCase());
  if (words.length === 0) {
    return (
      <Text numberOfLines={2} style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
        {text}
      </Text>
    );
  }
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <Text numberOfLines={2} style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
      {parts.map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <Text key={i} style={{ backgroundColor: tokens.accentSubtle, color: tokens.text, borderRadius: 2 }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

function ResultCard({
  result,
  query,
  onPress,
}: {
  result: SearchResult;
  query: string;
  onPress: (item: Item) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const item = result.item;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.resultCard,
        {
          borderRadius: radii.card,
          backgroundColor: tokens.surface,
          borderColor: tokens.glassBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.resultTopRow}>
        <Text numberOfLines={1} style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, flexShrink: 1 }}>
          {item.source.name ?? (item.source.url ? item.source.url : "")}
        </Text>
        <Text style={{ color: tokens.textTertiary, fontSize: 12 }}>·</Text>
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, fontVariant: ["tabular-nums"] }}>
          {formatDate(item.capturedAt)}
        </Text>
        <View style={{ flex: 1 }} />
        {result.matchKind ? (
          <Chip label={result.matchKind === "keyword" ? t("search.badgeKeyword") : t("search.badgeMeaning")} />
        ) : null}
        {item.status !== "done" ? (
          <StatusChip status={item.status} label={t(statusLabelKey(item.status))} size={12} />
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, marginTop: 4 }}>
        {item.title}
      </Text>
      {result.snippet ? (
        <View style={{ marginTop: 4 }}>
          <Highlighted text={result.snippet} query={query} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** S6 — search: smart/keywords/meaning modes, filters, recent queries. */
export default function SearchTab() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = getApiClient();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mode, setMode] = useState<SearchMode>("smart");
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState<TypeFilter>("any");
  const [collectionId, setCollectionId] = useState("any");
  const [tagId, setTagId] = useState("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Prefill from navigation params (e.g. tapping a tag in S9)
  const params = useLocalSearchParams<{ q?: string }>();
  useEffect(() => {
    if (params.q) setQuery(String(params.q));
  }, [params.q]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: recent } = useQuery({ queryKey: ["recent-queries"], queryFn: () => api.recentQueries() });
  const { data: collections } = useQuery({ queryKey: ["collections"], queryFn: () => api.listCollections() });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  const filters = useMemo<SearchFilters>(
    () => ({
      mode,
      types: type === "any" ? undefined : type === "file" ? ["pdf", "docx", "xlsx", "video"] : [type],
      collectionIds: collectionId === "any" ? undefined : [collectionId],
      tagIds: tagId === "any" ? undefined : [tagId],
      dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : undefined,
      dateTo: /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : undefined,
    }),
    [mode, type, collectionId, tagId, dateFrom, dateTo],
  );

  const hasActiveFilters =
    type !== "any" || collectionId !== "any" || tagId !== "any" || Boolean(dateFrom) || Boolean(dateTo);

  const searchQuery = useQuery({
    queryKey: ["search", debounced, filters],
    queryFn: () => api.search(debounced, filters),
    enabled: debounced.length > 0,
  });

  const clearFilters = () => {
    setType("any");
    setCollectionId("any");
    setTagId("any");
    setDateFrom("");
    setDateTo("");
  };

  const effectiveMode: SearchMode = mode === "meaning" && !features.semanticSearch ? "keywords" : mode;

  const typeChips: Array<{ value: TypeFilter; label: string }> = [
    { value: "any", label: t("feed.filterAll") },
    { value: "link", label: t("feed.filterLinks") },
    { value: "text", label: t("feed.filterNotes") },
    { value: "file", label: t("feed.filterFiles") },
    { value: "audio", label: t("feed.filterAudio") },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Search input with mic/attachment (bright green outline — web parity) */}
        <View
          style={[
            styles.searchBox,
            {
              borderRadius: radii.dialog,
              borderColor: rgba(tokens.accentRgb, 0.4),
              backgroundColor: tokens.surface,
            },
          ]}
        >
          <SearchIcon size={18} color={tokens.textTertiary} strokeWidth={1.5} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor={tokens.textTertiary}
            accessibilityLabel={t("common.search")}
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
              minHeight: 40,
              color: tokens.text,
              fontFamily: fonts.regular,
              fontSize: 14,
              lineHeight: 20,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("search.placeholder")}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Mic size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.attach")}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Paperclip size={18} color={tokens.textSecondary} strokeWidth={1.5} />
          </Pressable>
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setQuery("")} hitSlop={8}>
              <X size={16} color={tokens.textTertiary} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>

        {/* Mode segmented control + filters toggle */}
        <View style={styles.modeRow}>
          <SegmentedFilter
            ariaLabel={t("search.modeLabel")}
            value={mode}
            onChange={(v) => setMode(v as SearchMode)}
            compact
            options={[
              { value: "smart", label: t("search.modeSmart") },
              { value: "keywords", label: t("search.modeKeywords") },
              ...(features.semanticSearch ? [{ value: "meaning" as const, label: t("search.modeMeaning") }] : []),
            ]}
          />
          <Button
            size="sm"
            variant={showFilters ? "secondary" : "ghost"}
            label={t("search.filters")}
            icon={<Filter size={14} color={tokens.textSecondary} strokeWidth={1.5} />}
            onPress={() => setShowFilters((s) => !s)}
          />
          {hasActiveFilters ? (
            <Button size="sm" variant="ghost" label={t("search.clearFilters")} onPress={clearFilters} />
          ) : null}
        </View>

        {mode === "meaning" && !features.semanticSearch ? (
          <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12 }}>
            {t("search.semanticDisabled")}
          </Text>
        ) : null}

        {/* Filters panel */}
        {showFilters ? (
          <GlassSurface fallback style={{ borderRadius: radii.dialog, padding: 14, gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
                {t("search.filterType")}
              </Text>
              <View style={styles.chipWrap}>
                {typeChips.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={type === opt.value}
                    onPress={() => setType(opt.value)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
                {t("search.filterCollection")}
              </Text>
              <View style={styles.chipWrap}>
                <Chip label={t("feed.filterAll")} active={collectionId === "any"} onPress={() => setCollectionId("any")} />
                {(collections ?? []).map((c) => (
                  <Chip key={c.id} label={c.name} active={collectionId === c.id} onPress={() => setCollectionId(c.id)} />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
                {t("search.filterTag")}
              </Text>
              <View style={styles.chipWrap}>
                <Chip label={t("feed.filterAll")} active={tagId === "any"} onPress={() => setTagId("any")} />
                {(tags ?? []).map((tag) => (
                  <Chip key={tag.id} label={tag.name} active={tagId === tag.id} onPress={() => setTagId(tag.id)} />
                ))}
              </View>
            </View>

            <View style={styles.datesRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
                  {t("search.filterDateFrom")}
                </Text>
                <TextInput
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tokens.textTertiary}
                  autoCapitalize="none"
                  style={[
                    styles.dateInput,
                    { color: tokens.text, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, borderRadius: radii.control },
                  ]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
                  {t("search.filterDateTo")}
                </Text>
                <TextInput
                  value={dateTo}
                  onChangeText={setDateTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tokens.textTertiary}
                  autoCapitalize="none"
                  style={[
                    styles.dateInput,
                    { color: tokens.text, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, borderRadius: radii.control },
                  ]}
                />
              </View>
            </View>
          </GlassSurface>
        ) : null}

        {/* Recent queries */}
        {!debounced && (recent ?? []).length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.medium, fontSize: 12 }}>
              {t("search.recentQueries")}
            </Text>
            <View style={styles.chipWrap}>
              {(recent ?? []).map((q) => (
                <Chip key={q} label={q} onPress={() => setQuery(q)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Results */}
        {debounced && searchQuery.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : null}

        {debounced && searchQuery.isError ? (
          <View style={styles.center}>
            <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
              {t("common.errorGeneric")}
            </Text>
            <Button size="sm" variant="secondary" label={t("common.retry")} onPress={() => void searchQuery.refetch()} />
          </View>
        ) : null}

        {debounced && !searchQuery.isPending && (searchQuery.data ?? []).length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 16 }}>{t("search.noResults")}</Text>
            <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: "center" }}>
              {t("search.noResultsHint")}
            </Text>
            {hasActiveFilters ? (
              <Button size="sm" variant="secondary" label={t("search.clearFilters")} onPress={clearFilters} />
            ) : null}
          </View>
        ) : null}

        {(searchQuery.data ?? []).length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, fontVariant: ["tabular-nums"] }}
            >
              {t("search.resultsCount", { count: (searchQuery.data ?? []).length })}
            </Text>
            {(searchQuery.data ?? []).map((r) => (
              <ResultCard
                key={r.item.id}
                result={{ ...r, matchKind: effectiveMode === "keywords" ? "keyword" : r.matchKind }}
                query={debounced}
                onPress={(item) => router.push(`/items/${item.id}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  iconBtn: { padding: 4 },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  datesRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateInput: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  resultCard: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
  },
});
