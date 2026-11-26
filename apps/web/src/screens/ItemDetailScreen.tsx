import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  FolderPlus,
  Link2,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Chip,
  IconButton,
  ItemCardSkeleton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  StatusChip,
  Textarea,
  cn,
  statusLabelKey,
  useToast,
} from "@inbox/ui";
import type { Item } from "@inbox/api-client";
import { features } from "@inbox/api-client";
import { useApi } from "../state/api";
import { useMediaQuery } from "../state/settings";
import { useModals } from "../modals/ModalProvider";
import { Feed } from "./InboxScreen";
import { TagChipsRow, TagCombobox } from "../components/TagEditor";
import { formatDate, formatBytes, domainOf } from "../lib/format";

/** Collapsible section with a quiet header. */
function Section({
  title,
  children,
  defaultOpen = true,
  actions,
  id,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className={cn("shrink-0 text-text-tertiary transition-transform duration-150 ease-out", !open && "-rotate-90")}
            aria-hidden
          />
          <h2 className="truncate text-base font-semibold text-text">{title}</h2>
        </button>
        {actions}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function ItemDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isWide = useMediaQuery("(min-width: 1280px)");

  const [feedFilter] = useState<"all">("all");

  const itemQuery = useQuery({
    queryKey: ["item", id],
    queryFn: () => api.getItem(id!),
    enabled: Boolean(id),
    // Live pipeline updates: poll while the item is being processed.
    refetchInterval: (query) =>
      query.state.data?.status === "extracting" || query.state.data?.status === "annotating"
        ? 3000
        : false,
  });

  const relatedQuery = useQuery({
    queryKey: ["related", id],
    queryFn: () => api.relatedItems(id!, 5),
    enabled: Boolean(id),
  });

  const collectionsQuery = useQuery({ queryKey: ["collections"], queryFn: () => api.listCollections() });

  const itemStatus = itemQuery.data?.status;
  useEffect(() => {
    if (itemStatus && itemStatus !== "extracting" && itemStatus !== "annotating") {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
    }
  }, [itemStatus, queryClient]);

  const item = itemQuery.data;

  const detail = item ? (
    <ItemDetailContent
      item={item}
      related={relatedQuery.data ?? []}
      collections={collectionsQuery.data ?? []}
      onBack={() => navigate(-1)}
      showBack={!isWide}
    />
  ) : (
    <div className="mx-auto w-full max-w-detail p-4">
      {itemQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-base text-text-secondary">{t("common.errorGeneric")}</p>
          <Button onClick={() => void itemQuery.refetch()}>{t("common.retry")}</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </div>
      )}
    </div>
  );

  if (isWide) {
    // Right pane layout: feed 480px, detail fluid
    return (
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[480px] shrink-0 flex-col border-r border-border">
          <Feed
            filter={feedFilter}
            onFilterChange={() => undefined}
            compact
            activeItemId={id}
            onItemOpen={(it) => navigate(`/items/${it.id}`)}
          />
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">{detail}</div>
      </div>
    );
  }

  return <div className="min-h-0 flex-1 overflow-y-auto">{detail}</div>;
}

function ItemDetailContent({
  item,
  related,
  collections,
  onBack,
  showBack,
}: {
  item: Item;
  related: Item[];
  collections: Array<{ id: string; name: string }>;
  onBack: () => void;
  showBack: boolean;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { openAddToCollection, openReprocess, openExport, openConfirm, openProcessing } = useModals();

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  useEffect(() => {
    setTitleDraft(null);
    setCommentDraft(null);
    setAiDraft(null);
  }, [item.id]);

  const patch = useMutation({
    mutationFn: async (p: Parameters<typeof api.patchItem>[1]) => api.patchItem(item.id, p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["item", item.id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  const itemCollections = useMemo(
    () => collections.filter((c) => item.collectionIds.includes(c.id)),
    [collections, item.collectionIds],
  );

  const deleteItem = () => {
    openConfirm({
      title: t("item.deleteItem"),
      body: t("modals.confirmDeleteBody"),
      confirmLabel: t("common.delete"),
      danger: true,
      onConfirm: async () => {
        await api.deleteItems([item.id]);
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast.toast({
          variant: "undo",
          message: t("item.deletedUndo"),
          durationMs: 8000,
          onUndo: async () => {
            await api.saveText({ text: item.original.text ?? item.title, comment: item.userComment });
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
          },
        });
        navigate("/inbox");
      },
    });
  };

  const statusAttentionHint =
    item.status === "partial"
      ? item.type === "audio"
        ? t("status.partialAudio")
        : t("status.partialLink")
      : item.status === "ai_failed"
        ? t("status.aiFailedHint")
        : undefined;

  return (
    <div className="mx-auto w-full max-w-detail px-4 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 -mx-4 border-b border-glass-border bg-surface px-4 py-3">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex items-center gap-1 text-sm text-text-secondary hover:text-text"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            {t("common.back")}
          </button>
        )}

        {titleDraft !== null ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void patch.mutateAsync({ title: titleDraft });
                  setTitleDraft(null);
                } else if (e.key === "Escape") setTitleDraft(null);
              }}
              aria-label={t("item.editTitle")}
              className="min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-2 py-1 text-lg font-semibold text-text outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
            <IconButton
              label={t("common.save")}
              onClick={() => {
                void patch.mutateAsync({ title: titleDraft });
                setTitleDraft(null);
              }}
            >
              <Check size={16} strokeWidth={1.5} aria-hidden />
            </IconButton>
            <IconButton label={t("common.cancel")} onClick={() => setTitleDraft(null)}>
              <X size={16} strokeWidth={1.5} aria-hidden />
            </IconButton>
          </div>
        ) : (
          <h1 className="flex items-start gap-2 text-lg font-semibold leading-[26px] text-text">
            <span className="min-w-0 flex-1 break-words">{item.title}</span>
            <IconButton
              label={t("item.editTitle")}
              size="sm"
              className="mt-0.5 shrink-0"
              onClick={() => setTitleDraft(item.title)}
            >
              <Pencil size={14} strokeWidth={1.5} aria-hidden />
            </IconButton>
          </h1>
        )}

        {/* Source line */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
          {item.source.url && (
            <a
              href={item.source.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-accent underline-offset-2 hover:underline"
            >
              {domainOf(item.source.url)}
            </a>
          )}
          {!item.source.url && item.original.file && (
            <span className="font-mono">{item.original.file.name}</span>
          )}
          <span aria-hidden>·</span>
          <time className="tnum" dateTime={item.capturedAt}>
            {formatDate(item.capturedAt)}
          </time>
          {item.source.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>
                {t("item.publishedAt")}: <time className="tnum">{formatDate(item.source.publishedAt)}</time>
              </span>
            </>
          )}
          {item.lang && (
            <span
              className="rounded border border-border px-1 font-mono uppercase"
              title={t("item.langBadge", { lang: item.lang })}
            >
              {item.lang}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openProcessing(item)} aria-label={t("item.processingDetails")}>
            <StatusChip status={item.status} label={t(statusLabelKey(item.status))} />
          </button>
          <span className="flex-1" />
          {(item.source.url || item.original.file) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const url = item.source.url ?? item.original.file?.url;
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              {item.original.file ? <Download size={14} strokeWidth={1.5} aria-hidden /> : <ExternalLink size={14} strokeWidth={1.5} aria-hidden />}
              {t("item.openOriginal")}
            </Button>
          )}
          <Button size="sm" onClick={() => openAddToCollection([item.id])}>
            <FolderPlus size={14} strokeWidth={1.5} aria-hidden />
            {t("item.addToCollection")}
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={t("common.settings")} size="sm">
                <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<RefreshCcw size={14} strokeWidth={1.5} aria-hidden />} onSelect={() => openReprocess(item)}>
                {t("item.reprocess")}
              </MenuItem>
              {features.export && (
                <MenuItem icon={<Download size={14} strokeWidth={1.5} aria-hidden />} onSelect={() => openExport({ scope: "selected", itemIds: [item.id] })}>
                  {t("common.export")}
                </MenuItem>
              )}
              {item.source.url && (
                <MenuItem
                  icon={<Copy size={14} strokeWidth={1.5} aria-hidden />}
                  onSelect={() => {
                    void navigator.clipboard?.writeText(item.source.url!);
                    toast.toast({ variant: "success", message: t("common.copied") });
                  }}
                >
                  {t("item.copyLink")}
                </MenuItem>
              )}
              <MenuSeparator />
              <MenuItem icon={<Trash2 size={14} strokeWidth={1.5} aria-hidden />} danger onSelect={deleteItem}>
                {t("common.delete")}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>

        {statusAttentionHint && (
          <p role="status" className="mt-2 rounded-control border border-warning/40 bg-surface-subtle px-3 py-2 text-sm text-text-secondary">
            {statusAttentionHint}
          </p>
        )}
        {item.status === "partial" && item.type === "link" && (
          <p className="mt-1 text-xs text-text-tertiary">{t("item.linkOnlyWarning")}</p>
        )}
      </header>

      {/* Sections in fixed order */}

      {/* 1. Original */}
      <Section title={t("item.original")}>
        {item.type === "link" && item.source.url && (
          <a
            href={item.source.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-control border border-border p-3 hover:border-border-strong"
          >
            <Link2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-text">{item.title}</span>
              <span className="block truncate font-mono text-xs text-text-tertiary">{item.source.url}</span>
              <span className="block text-xs text-accent">{domainOf(item.source.url)}</span>
            </span>
          </a>
        )}
        {item.original.file && (
          <div className="flex items-center gap-3 rounded-control border border-border p-3">
            <FileIcon size={18} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-text">{item.original.file.name}</span>
              <span className="tnum block text-xs text-text-tertiary">{t("item.fileSize", { size: formatBytes(item.original.file.size) })}</span>
            </span>
            <a
              href={item.original.file.url}
              download={item.original.file.name}
              className="shrink-0 rounded-control border border-border-strong px-2 py-1 text-sm text-text hover:bg-surface-subtle"
            >
              {t("common.download")}
            </a>
          </div>
        )}
        {item.original.text && (
          <p className="whitespace-pre-wrap text-reading text-text" style={{ maxWidth: "70ch" }}>
            {item.original.text}
          </p>
        )}
        {item.type === "audio" && item.original.file && (
          <audio controls src={item.original.file.url} className="mt-2 w-full">
            {t("recorder.preview")}
          </audio>
        )}
        {item.type === "video" && item.original.file && (
          <video
            controls
            preload="metadata"
            src={item.original.file.url}
            className="mt-2 w-full rounded-control border border-border bg-black"
            aria-label={item.original.file.name}
          />
        )}
        {item.type === "image" && item.original.file && (
          <img
            src={item.original.file.url}
            alt={item.original.file.name}
            className="mt-2 max-h-[70vh] w-full rounded-control border border-border object-contain"
          />
        )}
        {!item.original.text && !item.original.file && !item.source.url && (
          <p className="text-base text-text-tertiary">{t("item.noOriginalText")}</p>
        )}
      </Section>

      {/* 2. My comment */}
      <Section title={t("item.myComment")}>
        {commentDraft !== null ? (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={3}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={t("item.commentPlaceholder")}
              aria-label={t("item.myComment")}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  void patch.mutateAsync({ userComment: commentDraft || undefined });
                  setCommentDraft(null);
                }}
              >
                {t("common.save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCommentDraft(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : item.userComment ? (
          <button
            type="button"
            onClick={() => setCommentDraft(item.userComment ?? "")}
            className="block w-full rounded-control border-l-2 border-accent bg-surface-subtle p-3 text-left text-reading text-text hover:bg-surface"
            aria-label={`${t("item.myComment")} — ${t("common.edit")}`}
          >
            {item.userComment}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCommentDraft("")}
            className="block w-full rounded-control border border-dashed border-border-strong p-3 text-left text-base text-text-tertiary hover:border-accent hover:text-text-secondary"
          >
            {t("item.commentPlaceholder")}
          </button>
        )}
      </Section>

      {/* 3. AI annotation */}
      <Section
        title={t("item.aiAnnotation")}
        actions={
          <Chip as="span" className="shrink-0 font-mono">
            {t("item.aiLabel")}
          </Chip>
        }
      >
        <p className="mb-2 text-xs text-text-tertiary">{t("item.aiNotice")}</p>
        {aiDraft !== null ? (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={4}
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              aria-label={t("item.aiAnnotation")}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  void patch.mutateAsync({ aiAnnotation: aiDraft, aiEdited: true });
                  setAiDraft(null);
                }}
              >
                {t("common.save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAiDraft(null)}>
                {t("common.cancel")}
              </Button>
              {item.ai.edited && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void patch.mutateAsync({ restoreAi: true });
                    setAiDraft(null);
                  }}
                >
                  <RotateCcw size={14} strokeWidth={1.5} aria-hidden />
                  {t("item.restoreAi")}
                </Button>
              )}
            </div>
          </div>
        ) : item.ai.annotation ? (
          <div>
            <button
              type="button"
              onClick={() => setAiDraft(item.ai.annotation ?? "")}
              className="block w-full rounded-control p-1 text-left text-reading text-text hover:bg-surface-subtle"
              aria-label={`${t("item.aiAnnotation")} — ${t("common.edit")}`}
            >
              {item.ai.annotation}
              {item.ai.edited && <span className="ml-2 align-middle text-xs text-text-tertiary">({t("common.edit")})</span>}
            </button>
            <p className="mt-2 text-xs text-text-tertiary">
              {t("item.aiModel", { model: item.ai.model })}
              {item.ai.generatedAt && <> · {t("item.aiGeneratedAt", { date: formatDate(item.ai.generatedAt) })}</>}
            </p>
          </div>
        ) : (
          <p className="text-base text-text-tertiary">
            {item.status === "ai_failed" ? t("status.aiFailedHint") : t("status.annotating")}
          </p>
        )}
      </Section>

      {/* 4. Tags */}
      <Section title={t("item.tags")} id="tags">
        <div className="flex flex-wrap items-center gap-1.5">
          <TagChipsRow
            userTags={item.userTags}
            suggestedTags={item.suggestedTags}
            onAccept={(tag) => patch.mutate({ acceptSuggestedTag: tag })}
            onRemoveUser={(tag) => patch.mutate({ userTags: item.userTags.filter((x) => x !== tag) })}
            onRemoveSuggested={(tag) => patch.mutate({ removeSuggestedTag: tag })}
          />
          <TagCombobox
            placeholder={`+ ${t("item.addTag")}`}
            exclude={item.userTags}
            onAdd={(tag) => patch.mutate({ userTags: [...new Set([...item.userTags, tag])] })}
          />
        </div>
      </Section>

      {/* 5. Collections */}
      <Section title={t("item.collections")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {itemCollections.map((c) => (
            <Chip key={c.id} onClick={() => navigate(`/collections/${c.id}`)}>
              {c.name}
            </Chip>
          ))}
          <Chip dashed onClick={() => openAddToCollection([item.id])}>
            <FolderPlus size={12} strokeWidth={1.5} aria-hidden />
            {t("item.addToCollection")}
          </Chip>
        </div>
      </Section>

      {/* 6. Extracted text — collapsed by default */}
      <Section
        title={t("item.extractedText")}
        defaultOpen={false}
        actions={
          item.extracted.text && (
            <IconButton
              label={t("item.copyText")}
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(item.extracted.text ?? "");
                toast.toast({ variant: "success", message: t("common.copied") });
              }}
            >
              <Copy size={14} strokeWidth={1.5} aria-hidden />
            </IconButton>
          )
        }
      >
        {item.extracted.error ? (
          <div className="flex flex-col items-start gap-2 rounded-control border border-danger/40 bg-surface p-3">
            <p className="text-base text-danger">{item.extracted.error}</p>
            <Button size="sm" onClick={() => void api.retryExtraction(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["item", item.id] }))}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden />
              {t("item.retryExtraction")}
            </Button>
          </div>
        ) : item.extracted.text ? (
          <p className="whitespace-pre-wrap text-reading text-text" style={{ maxWidth: "70ch" }}>
            {item.extracted.text}
          </p>
        ) : (
          <p className="text-base text-text-tertiary">{t("status.extracting")}</p>
        )}
      </Section>

      {/* 7. Related items */}
      {related.length > 0 && (
        <Section title={t("item.relatedItems")} defaultOpen>
          <ul className="flex flex-col">
            {related.map((rel) => (
              <li key={rel.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => navigate(`/items/${rel.id}`)}
                  className="flex w-full items-center gap-2 py-2 text-left hover:bg-surface-subtle"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{rel.title}</span>
                  <span className="tnum shrink-0 text-xs text-text-tertiary">{formatDate(rel.capturedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 8. Processing details — collapsed */}
      <Section title={t("item.processingDetails")} defaultOpen={false}>
        <ol className="flex flex-col gap-1">
          {item.processing.map((step, i) => (
            <li key={`${step.name}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="w-36 shrink-0 text-text-secondary">
                {step.name === "extract" ? t("item.stepExtract") : t("item.stepAnnotate")}
              </span>
              <span
                className={cn(
                  "tnum",
                  step.status === "failed" ? "text-danger" : step.status === "ok" ? "text-success" : "text-text-tertiary",
                )}
              >
                {t(
                  step.status === "pending"
                    ? "item.stepPending"
                    : step.status === "running"
                      ? "item.stepRunning"
                      : step.status === "ok"
                        ? "item.stepOk"
                        : step.status === "failed"
                          ? "item.stepFailed"
                          : "item.stepSkipped",
                )}
              </span>
              {step.finishedAt && <span className="tnum text-xs text-text-tertiary">{formatDate(step.finishedAt)}</span>}
              {step.error && <span className="min-w-0 flex-1 truncate text-xs text-danger">{step.error}</span>}
            </li>
          ))}
        </ol>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => openProcessing(item)}>
          {t("modals.processingTitle")}
        </Button>
      </Section>
    </div>
  );
}
