import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Trash2, X } from "lucide-react";
import { Button, ItemCardSkeleton, SegmentedControl, cn, useToast } from "@inbox/ui";
import type { Item } from "@inbox/api-client";
import { FEED_PAGE_SIZE, features } from "@inbox/api-client";
import { useApi, ITEM_UPDATED_EVENT } from "../state/api";
import { useCondensedHeader } from "../state/condensed";
import { useMediaQuery } from "../state/settings";
import { ItemCard } from "../components/ItemCard";
import { Composer } from "../components/Composer";
import { useModals } from "../modals/ModalProvider";
import { dayKey, formatDaySeparator } from "../lib/format";

type FeedFilter = "all" | "attention" | "link" | "text" | "file" | "audio";

const filterOptions = (t: (k: string) => string): Array<{ value: FeedFilter; label: string }> => [
  { value: "all", label: t("feed.filterAll") },
  { value: "attention", label: t("feed.filterAttention") },
  { value: "link", label: t("feed.filterLinks") },
  { value: "text", label: t("feed.filterNotes") },
  { value: "file", label: t("feed.filterFiles") },
  ...(features.audio ? [{ value: "audio" as FeedFilter, label: t("feed.filterAudio") }] : []),
];

/**
 * S4 feed. Used both as the full inbox screen and (compact, 480px) as the
 * left pane of the wide-screen item detail layout.
 */
export function Feed({
  filter,
  onFilterChange,
  compact,
  activeItemId,
  onItemOpen,
}: {
  filter: FeedFilter;
  onFilterChange: (f: FeedFilter) => void;
  compact?: boolean;
  activeItemId?: string;
  onItemOpen?: (item: Item) => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { openAddToCollection, openExport, openConfirm, openUpload, openReprocess, openProcessing } = useModals();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Condensing filter bar: state lives in the shell context so the header
  // can reflect data-condensed while the bar stays the same DOM node.
  const header = useCondensedHeader();
  const setCondensed = header?.setCondensed;
  const condensed = compact ? false : header?.condensed ?? false;
  const condensedRef = useRef(condensed);
  condensedRef.current = condensed;
  const isDockable = useMediaQuery("(min-width: 768px)");
  const barRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstEvalRef = useRef(true);
  const [barHeight, setBarHeight] = useState(0);

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", filter],
    queryFn: ({ pageParam }) =>
      api.listItems({
        cursor: pageParam as string | undefined,
        limit: FEED_PAGE_SIZE,
        filter,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.items.length === 0) return undefined;
      return lastPage.items[0].capturedAt;
    },
  });

  // Live pipeline updates from MockApi
  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
    };
    window.addEventListener(ITEM_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ITEM_UPDATED_EVENT, handler);
  }, [queryClient]);

  const items = useMemo(() => {
    const pages = feedQuery.data?.pages ?? [];
    const all = pages.flatMap((p) => p.items);
    // dedupe by id, keep chronological (oldest first, newest at bottom)
    const seen = new Set<string>();
    return all.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true))).sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    );
  }, [feedQuery.data]);

  // Keep pinned to bottom on first load & new items
  const prevCountRef = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevCountRef.current === 0 || items.length > prevCountRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  const loadOlder = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      const el = scrollRef.current;
      const prevHeight = el?.scrollHeight ?? 0;
      void feedQuery.fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [feedQuery]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80) loadOlder();
  };

  // Measure the in-flow bar height (the placeholder reserves it when docked)
  // and track horizontal overflow of the compact bar for the edge fade masks.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!condensedRef.current) setBarHeight(bar.offsetHeight);
      const list = bar.querySelector<HTMLElement>('[role="tablist"]');
      if (list && fadeRef.current) {
        if (list.scrollWidth > list.clientWidth + 1) fadeRef.current.dataset.overflow = "true";
        else delete fadeRef.current.dataset.overflow;
      }
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Condense trigger: IntersectionObserver on the live-edge sentinel (no scroll
  // listeners). Hysteresis via observer re-creation: condense when the sentinel
  // sinks more than 80px below the viewport, expand when back within 24px.
  // iOS overscroll keeps the sentinel visible, so it never flips the state.
  useEffect(() => {
    if (compact || !setCondensed) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || typeof IntersectionObserver === "undefined") return;
    const rootMargin = condensed ? "0px 0px 24px 0px" : "0px 0px 80px 0px";
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const next = !entry.isIntersecting;
        if (firstEvalRef.current) {
          // Loaded already scrolled: apply the state instantly, no animation/flash.
          firstEvalRef.current = false;
          if (next !== condensed) setCondensed(next);
          return;
        }
        if (next === condensed) return;
        // View Transitions morph with instant fallback; compositor-only.
        const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (typeof doc.startViewTransition === "function" && !reduceMotion) {
          doc.startViewTransition(() => {
            flushSync(() => setCondensed(next));
          });
        } else {
          setCondensed(next);
        }
      },
      { root, rootMargin, threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [compact, condensed, setCondensed, items.length]);

  // Leaving the feed (e.g. into the detail pane) restores the normal header.
  useEffect(() => () => setCondensed?.(false), [setCondensed]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const backup = items.filter((i) => ids.includes(i.id));
      await api.deleteItems(ids);
      return backup;
    },
    onSuccess: (backup) => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
      setSelected(new Set());
      setSelectionMode(false);
      // Single-item delete: immediate with an 8s Undo toast
      if (backup.length === 1) {
        toast.toast({
          variant: "undo",
          message: t("item.deletedUndo"),
          durationMs: 8000,
          onUndo: async () => {
            const item = backup[0];
            await api.saveText({ text: item.original.text ?? item.title, comment: item.userComment });
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
          },
        });
      }
    },
  });

  const confirmBulkDelete = () => {
    const ids = [...selected];
    if (ids.length === 1) {
      void deleteMutation.mutateAsync(ids);
      return;
    }
    openConfirm({
      title: t("modals.confirmBulkDeleteTitle", { count: ids.length }),
      body: t("modals.confirmDeleteBody"),
      confirmLabel: t("common.delete"),
      danger: true,
      onConfirm: async () => {
        await api.deleteItems(ids);
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
        setSelected(new Set());
        setSelectionMode(false);
      },
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openItem = (item: Item) => {
    if (onItemOpen) onItemOpen(item);
    else navigate(`/items/${item.id}`);
  };

  // Drop a file anywhere on the feed -> Upload dialog
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files.length) {
        openUpload({ presetFiles: Array.from(e.dataTransfer.files) });
      }
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) setDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragenter", prevent);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragenter", prevent);
    };
  }, [openUpload]);

  // Group by day for separators
  const grouped = useMemo(() => {
    const out: Array<{ key: string; items: Item[] }> = [];
    for (const item of items) {
      const key = dayKey(item.capturedAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, items: [item] });
    }
    return out;
  }, [items]);

  const isEmpty = !feedQuery.isPending && items.length === 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "w-full" : "w-full")}>
      {/* Filter bar: the SAME DOM node in both states (no duplication, no
          reparenting — focus, state and tab order survive the transition).
          Docking is pure CSS (fixed). The placeholder reserves the in-flow
          slot so nothing jumps and scrollY never changes because of the
          switch — no scroll → height → scroll loop. */}
      <div style={condensed && isDockable ? { height: barHeight || undefined } : undefined}>
        <div
          ref={barRef}
          className={cn(
            "feed-filter-bar",
            condensed && isDockable
              ? "fixed right-4 top-0 z-30 flex h-[var(--header-h)] max-w-[50vw] items-center"
              : cn(
                  "border-b border-glass-border bg-surface px-3",
                  condensed ? "py-1" : "py-2",
                  !compact && "mx-auto w-full max-w-feed",
                ),
          )}
        >
          <div ref={fadeRef} className="fade-edges min-w-0 flex-1">
            <SegmentedControl
              options={filterOptions(t)}
              value={filter}
              onChange={onFilterChange}
              ariaLabel={t("feed.filterAll")}
              compact={condensed}
              className={condensed && isDockable ? "" : "w-full"}
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div
          role="toolbar"
          aria-label={t("feed.selectMode")}
          className="flex items-center gap-2 border-b border-border bg-accent-subtle px-3 py-2"
        >
          <span className="tnum text-sm font-medium text-text">{t("feed.selected", { count: selected.size })}</span>
          <span className="flex-1" />
          <Button size="sm" onClick={() => openAddToCollection([...selected])} disabled={selected.size === 0}>
            <FolderPlus size={14} strokeWidth={1.5} aria-hidden />
            {t("feed.bulkAddToCollection")}
          </Button>
          {features.export && (
            <Button size="sm" onClick={() => openExport({ scope: "selected", itemIds: [...selected] })} disabled={selected.size === 0}>
              {t("feed.bulkExport")}
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={confirmBulkDelete} disabled={selected.size === 0}>
            <Trash2 size={14} strokeWidth={1.5} aria-hidden />
            {t("feed.bulkDelete")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("feed.clearSelection")}
            onClick={() => {
              setSelectionMode(false);
              setSelected(new Set());
            }}
          >
            <X size={14} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn("relative min-h-0 flex-1 overflow-y-auto")}
        aria-busy={feedQuery.isPending}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-accent-subtle/80">
            <p className="rounded-dialog border-2 border-dashed border-accent bg-surface px-6 py-4 text-md font-medium text-accent">
              {t("composer.dropAnywhere")}
            </p>
          </div>
        )}

        <div className={cn("mx-auto flex w-full flex-col", compact ? "" : "max-w-feed")}>
          {feedQuery.isPending && (
            <div aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <ItemCardSkeleton key={i} />
              ))}
            </div>
          )}

          {feedQuery.isError && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <p className="text-base text-text-secondary">{t("feed.loadError")}</p>
              <Button size="sm" onClick={() => void feedQuery.refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          )}

          {feedQuery.hasNextPage && !feedQuery.isPending && (
            <p className="py-2 text-center text-xs text-text-tertiary" aria-live="polite">
              {feedQuery.isFetchingNextPage ? t("feed.loadingOlder") : ""}
            </p>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
              <p className="text-md text-text">{t("feed.emptyTitle")}</p>
              <p className="text-base text-text-secondary">{t("feed.emptyExample1")}</p>
              <p className="text-base text-text-secondary">{t("feed.emptyExample2")}</p>
              <p className="text-base text-text-secondary">{t("feed.emptyExample3")}</p>
            </div>
          )}

          {/* Chronological feed, newest at the bottom, with date separators */}
          <div role={selectionMode ? "listbox" : "feed"} aria-label={t("shell.inbox")} aria-multiselectable={selectionMode || undefined}>
            {grouped.map((group) => (
              <section key={group.key} aria-label={group.items[0].capturedAt}>
                <div className="sticky top-0 z-[5] flex justify-center py-2">
                  <span className="rounded-control border border-glass-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary glass-rim">
                    {formatDaySeparator(group.items[0].capturedAt, t("common.today"), t("common.yesterday"))}
                  </span>
                </div>
                {group.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    active={item.id === activeItemId}
                    selectionMode={selectionMode}
                    selected={selected.has(item.id)}
                    onSelectToggle={toggleSelect}
                    onOpen={openItem}
                    onLongPress={(id) => {
                      setSelectionMode(true);
                      setSelected((prev) => new Set(prev).add(id));
                    }}
                    onAddToCollection={(ids) => openAddToCollection(ids)}
                    onEditTags={(it) => navigate(`/items/${it.id}#tags`)}
                    onMore={(it) => openReprocess(it)}
                    onStatusClick={(it) => openProcessing(it)}
                  />
                ))}
              </section>
            ))}
          </div>

          {/* aria-live region announcing status changes (polite) */}
          <div aria-live="polite" className="sr-only">
            {items
              .filter((i) => i.status !== "done")
              .map((i) => `${i.title}: ${t(`status.${i.status === "extraction_failed" ? "extractionFailed" : i.status === "ai_failed" ? "aiFailed" : i.status}`)}`)
              .join(", ")}
          </div>

          {/* Live-edge sentinel: the condensing trigger observed via
              IntersectionObserver (hysteresis 80px in / 24px out) */}
          <div ref={sentinelRef} aria-hidden className="h-px w-full shrink-0" />
        </div>
      </div>

      {!compact && <Composer />}
    </div>
  );
}

/** S4 /inbox screen. */
export function InboxScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get("filter") ?? "all") as FeedFilter;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Feed
        filter={filter}
        onFilterChange={(f) => setSearchParams(f === "all" ? {} : { filter: f })}
      />
    </div>
  );
}
