import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search as SearchIcon, X } from "lucide-react";
import { Button, ItemCardSkeleton, SegmentedControl, Select, cn } from "@inbox/ui";
import type { ItemType, SearchFilters, SearchMode } from "@inbox/api-client";
import { features } from "@inbox/api-client";
import { useApi } from "../state/api";
import { ItemCard } from "../components/ItemCard";
import { useModals } from "../modals/ModalProvider";

type TypeFilter = ItemType | "any" | "file";

const TYPE_OPTIONS: Array<{ value: TypeFilter; labelKey: string }> = [
  { value: "any", labelKey: "feed.filterAll" },
  { value: "link", labelKey: "feed.filterLinks" },
  { value: "text", labelKey: "feed.filterNotes" },
  { value: "file", labelKey: "feed.filterFiles" },
  { value: "audio", labelKey: "feed.filterAudio" },
];

export function SearchScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { openAddToCollection, openReprocess, openProcessing } = useModals();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mode, setMode] = useState<SearchMode>("smart");
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState<TypeFilter>("any");
  const [collectionId, setCollectionId] = useState("any");
  const [tagId, setTagId] = useState("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: recent } = useQuery({
    queryKey: ["recent-queries"],
    queryFn: () => api.recentQueries(),
  });
  const { data: collections } = useQuery({ queryKey: ["collections"], queryFn: () => api.listCollections() });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  const filters = useMemo<SearchFilters>(
    () => ({
      mode,
      types: type === "any" ? undefined : type === "file" ? ["pdf", "docx", "xlsx", "video"] : [type],
      collectionIds: collectionId === "any" ? undefined : [collectionId],
      tagIds: tagId === "any" ? undefined : [tagId],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
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

  const effectiveMode = mode === "meaning" && !features.semanticSearch ? "keywords" : mode;

  return (
    <div className="mx-auto flex w-full max-w-feed flex-1 flex-col px-3 pb-8">
      {/* Large search input */}
      <div className="mt-4 flex items-center gap-3 rounded-dialog border border-border-strong bg-surface px-4 focus-within:border-accent">
        <SearchIcon size={20} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("common.search")}
          autoFocus
          className="h-14 w-full bg-transparent text-md text-text outline-none placeholder:text-text-tertiary"
        />
        {query && (
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setQuery("")}
            className="rounded p-1 text-text-tertiary hover:text-text"
          >
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>

      {/* Mode segmented control */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel={t("search.modeLabel")}
          value={mode}
          onChange={(v) => setMode(v as SearchMode)}
          options={[
            { value: "smart", label: t("search.modeSmart") },
            { value: "keywords", label: t("search.modeKeywords") },
            ...(features.semanticSearch ? [{ value: "meaning" as const, label: t("search.modeMeaning") }] : []),
          ]}
        />
        <Button size="sm" variant={showFilters ? "secondary" : "ghost"} onClick={() => setShowFilters((s) => !s)}>
          <Filter size={14} strokeWidth={1.5} aria-hidden />
          {t("search.filters")}
        </Button>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            {t("search.clearFilters")}
          </Button>
        )}
      </div>

      {!features.semanticSearch && mode === "meaning" && (
        <p className="mt-2 text-sm text-text-tertiary">{t("search.semanticDisabled")}</p>
      )}

      {/* Filter row (inline; bottom-sheet style on mobile via dialog-free panel) */}
      {showFilters && (
        <div
          className={cn(
            "mt-3 grid grid-cols-1 gap-3 rounded-dialog border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3",
          )}
          role="group"
          aria-label={t("search.filters")}
        >
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {t("search.filterType")}
            <Select
              ariaLabel={t("search.filterType")}
              value={type}
              onValueChange={(v) => setType(v as ItemType | "any")}
              options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {t("search.filterCollection")}
            <Select
              ariaLabel={t("search.filterCollection")}
              value={collectionId}
              onValueChange={setCollectionId}
              options={[
                { value: "any", label: t("feed.filterAll") },
                ...(collections ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {t("search.filterTag")}
            <Select
              ariaLabel={t("search.filterTag")}
              value={tagId}
              onValueChange={setTagId}
              options={[
                { value: "any", label: t("feed.filterAll") },
                ...(tags ?? []).map((tag) => ({ value: tag.id, label: tag.name })),
              ]}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {t("search.filterDateFrom")}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-control border border-border-strong bg-surface px-2 text-base text-text max-sm:h-11"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {t("search.filterDateTo")}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-control border border-border-strong bg-surface px-2 text-base text-text max-sm:h-11"
            />
          </label>
        </div>
      )}

      {/* Results */}
      <div className="mt-4">
        {!debounced && (
          <div className="py-6">
            {(recent ?? []).length > 0 && (
              <>
                <h2 className="mb-2 text-sm font-medium text-text-tertiary">{t("search.recentQueries")}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {(recent ?? []).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuery(q)}
                      className="rounded-control border border-border px-2 py-1 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {debounced && searchQuery.isPending && (
          <div aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        )}

        {debounced && searchQuery.isError && (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-base text-text-secondary">{t("common.errorGeneric")}</p>
            <Button size="sm" onClick={() => void searchQuery.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        {debounced && !searchQuery.isPending && searchQuery.data?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-md text-text">{t("search.noResults")}</p>
            <p className="text-base text-text-secondary">{t("search.noResultsHint")}</p>
            {hasActiveFilters && (
              <Button size="sm" onClick={clearFilters}>
                {t("search.clearFilters")}
              </Button>
            )}
          </div>
        )}

        {searchQuery.data && searchQuery.data.length > 0 && (
          <>
            <p className="mb-2 text-sm text-text-tertiary tnum" aria-live="polite">
              {t("search.resultsCount", { count: searchQuery.data.length })}
            </p>
            <div className="overflow-hidden rounded-dialog border border-border bg-surface">
              {searchQuery.data.map((r) => (
                <ItemCard
                  key={r.item.id}
                  item={r.item}
                  snippet={r.snippet}
                  matchKind={effectiveMode === "keywords" ? "keyword" : r.matchKind}
                  snippetQuery={debounced}
                  onOpen={(item) => navigate(`/items/${item.id}`)}
                  onAddToCollection={(ids) => openAddToCollection(ids)}
                  onMore={(item) => openReprocess(item)}
                  onStatusClick={(item) => openProcessing(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
