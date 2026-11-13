import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
  File as FileIcon,
  FileText,
  FolderPlus,
  Link2,
  MoreHorizontal,
  ExternalLink,
  Music,
  Tag as TagIcon,
} from "lucide-react";
import { Chip, Menu, MenuContent, MenuItem, MenuTrigger, StatusChip, TagChip, cn, statusLabelKey } from "@inbox/ui";
import type { Item } from "@inbox/api-client";
import { formatRelative } from "../lib/format";

export const typeIcon = (type: Item["type"], size = 16) => {
  switch (type) {
    case "link":
      return <Link2 size={size} strokeWidth={1.5} aria-hidden />;
    case "audio":
      return <Music size={size} strokeWidth={1.5} aria-hidden />;
    case "pdf":
    case "docx":
      return <FileIcon size={size} strokeWidth={1.5} aria-hidden />;
    default:
      return <FileText size={size} strokeWidth={1.5} aria-hidden />;
  }
};

export interface ItemCardProps {
  item: Item;
  selected?: boolean;
  selectionMode?: boolean;
  onSelectToggle?: (id: string) => void;
  onOpen?: (item: Item) => void;
  onLongPress?: (id: string) => void;
  onAddToCollection?: (ids: string[]) => void;
  onEditTags?: (item: Item) => void;
  onMore?: (item: Item) => void;
  onStatusClick?: (item: Item) => void;
  /** search result extras */
  snippet?: string;
  matchKind?: "keyword" | "meaning";
  snippetQuery?: string;
  active?: boolean;
}

function sourceLabel(item: Item): string {
  if (item.source.name) return item.source.name;
  if (item.original.file) return item.original.file.name;
  return "";
}

function highlight(text: string, query?: string): React.ReactNode {
  if (!query?.trim()) return text;
  const words = query.trim().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return text;
  const lowerWords = words.map((w) => w.toLowerCase());
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    lowerWords.includes(p.toLowerCase()) ? <mark key={i}>{p}</mark> : p,
  );
}

export const ItemCard = memo(function ItemCard({
  item,
  selected,
  selectionMode,
  onSelectToggle,
  onOpen,
  onLongPress,
  onAddToCollection,
  onEditTags,
  onMore,
  onStatusClick,
  snippet,
  matchKind,
  snippetQuery,
  active,
}: ItemCardProps) {
  const { t } = useTranslation();
  const showStatus = item.status !== "done";

  let pressTimer: number | undefined;
  const onTouchStart = () => {
    if (!onLongPress) return;
    pressTimer = window.setTimeout(() => onLongPress(item.id), 500);
  };
  const clearPress = () => {
    if (pressTimer) window.clearTimeout(pressTimer);
  };

  const allTags = [
    ...item.userTags.map((tag) => ({ name: tag, suggested: false })),
    ...item.suggestedTags.filter((s) => !item.userTags.includes(s)).map((tag) => ({ name: tag, suggested: true })),
  ];
  const visibleTags = allTags.slice(0, 3);
  const extraTags = allTags.length - visibleTags.length;

  const openOriginal = () => {
    if (item.source.url) window.open(item.source.url, "_blank", "noopener,noreferrer");
    else if (item.original.file) window.open(item.original.file.url, "_blank", "noopener,noreferrer");
  };
  const hasOriginal = Boolean(item.source.url || item.original.file);

  return (
    <article
      role={selectionMode ? "option" : undefined}
      aria-selected={selectionMode ? selected : undefined}
      className={cn(
        "group relative border-b border-border bg-surface px-4 py-3 transition-colors duration-150 ease-out",
        onOpen && "cursor-pointer hover:bg-surface-subtle",
        active && "bg-accent-subtle hover:bg-accent-subtle",
        selected && "bg-accent-subtle",
      )}
      onClick={() => {
        if (selectionMode) onSelectToggle?.(item.id);
        else onOpen?.(item);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={clearPress}
      onTouchMove={clearPress}
    >
      {/* Row 1: type icon, source, ·, relative time, status chip */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        {selectionMode && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() => onSelectToggle?.(item.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${t("feed.selectMode")}: ${item.title}`}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        )}
        <span className="shrink-0 text-text-secondary">{typeIcon(item.type)}</span>
        <span className="truncate">{sourceLabel(item)}</span>
        <span aria-hidden>·</span>
        <time className="tnum shrink-0" dateTime={item.capturedAt}>
          {formatRelative(item.capturedAt)}
        </time>
        {item.lang && (
          <span
            className="shrink-0 rounded border border-border px-1 font-mono text-[10px] uppercase text-text-tertiary"
            title={t("item.langBadge", { lang: item.lang })}
          >
            {item.lang}
          </span>
        )}
        <span className="flex-1" />
        {matchKind && (
          <Chip as="span" className="shrink-0">
            {matchKind === "keyword" ? t("search.badgeKeyword") : t("search.badgeMeaning")}
          </Chip>
        )}
        {showStatus &&
          (onStatusClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusClick(item);
              }}
              aria-label={t("item.processingDetails")}
              className="shrink-0 rounded"
            >
              <StatusChip status={item.status} label={t(statusLabelKey(item.status))} compact />
            </button>
          ) : (
            <StatusChip status={item.status} label={t(statusLabelKey(item.status))} compact className="shrink-0" />
          ))}
      </div>

      {/* Row 2: title */}
      <h3 className="mt-1 line-clamp-1 text-[15px] font-semibold leading-[22px] text-text max-sm:line-clamp-2">
        {highlight(item.title, snippetQuery)}
      </h3>

      {/* Search snippet (replaces rows 3–4 in search results) */}
      {snippet ? (
        <p className="mt-1 line-clamp-2 text-base text-text-secondary">{highlight(snippet, snippetQuery)}</p>
      ) : (
        <>
          {/* Row 3: AI annotation */}
          {item.ai.annotation && (
            <p className="mt-1 line-clamp-2 text-base text-text-secondary">
              <span className="mr-1 rounded border border-border px-1 align-middle font-mono text-[10px] text-text-tertiary">
                {t("item.aiLabel")}
              </span>
              {item.ai.annotation}
            </p>
          )}

          {/* Row 4: user comment with accent left rule */}
          {item.userComment && (
            <p className="mt-1 line-clamp-2 border-l-2 border-accent pl-2 text-base text-text-secondary">
              {item.userComment}
            </p>
          )}
        </>
      )}

      {/* Row 5: tags, max 3 + "+N"; AI-suggested dashed */}
      {(visibleTags.length > 0 || extraTags > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {visibleTags.map((tag) => (
            <TagChip key={`${tag.name}-${tag.suggested}`} label={tag.name} suggested={tag.suggested} />
          ))}
          {extraTags > 0 && (
            <Chip as="span" className="tnum">
              +{extraTags}
            </Chip>
          )}
        </div>
      )}

      {/* Hover quick actions (desktop only) */}
      {!selectionMode && (
        <div
          className="absolute right-3 top-9 hidden items-center gap-0.5 rounded-control border border-border bg-surface p-0.5 shadow-pop group-hover:flex max-lg:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {onAddToCollection && (
            <button
              type="button"
              aria-label={t("item.addToCollection")}
              title={t("item.addToCollection")}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
              onClick={() => onAddToCollection([item.id])}
            >
              <FolderPlus size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
          {onEditTags && (
            <button
              type="button"
              aria-label={t("item.addTag")}
              title={t("item.addTag")}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
              onClick={() => onEditTags(item)}
            >
              <TagIcon size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
          {hasOriginal && (
            <button
              type="button"
              aria-label={t("item.openOriginal")}
              title={t("item.openOriginal")}
              className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
              onClick={openOriginal}
            >
              <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
          {onMore && (
            <Menu>
              <MenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("item.reprocess")}
                  className="rounded p-1.5 text-text-secondary hover:bg-surface-subtle hover:text-text"
                >
                  <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
                </button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => onMore(item)}>{t("item.reprocess")}</MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
      )}
    </article>
  );
});
