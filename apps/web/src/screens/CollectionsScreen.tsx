import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Plus, X } from "lucide-react";
import { Button, ItemCardSkeleton, useToast } from "@inbox/ui";
import { useApi } from "../state/api";
import { useModals } from "../modals/ModalProvider";
import { formatDate } from "../lib/format";

/** S7 /collections: list rows (not a card grid). */
export function CollectionsScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { openCollectionForm } = useModals();

  const { data: collections, isPending, isError } = useQuery({
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
    <div className="mx-auto w-full max-w-feed flex-1 px-3 pb-8">
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">{t("collections.title")}</h1>
        <Button variant="primary" size="sm" onClick={() => openCollectionForm()}>
          <Plus size={14} strokeWidth={1.5} aria-hidden />
          {t("collections.newCollection")}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-dialog border border-border bg-surface">
        {isPending && (
          <div aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        )}
        {isError && (
          <p className="p-6 text-center text-base text-text-secondary">{t("common.errorGeneric")}</p>
        )}
        {!isPending && (collections ?? []).length === 0 && (
          <p className="p-8 text-center text-base text-text-secondary">{t("collections.empty")}</p>
        )}
        {(collections ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate(`/collections/${c.id}`)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-subtle"
          >
            <Folder size={18} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-text">{c.name}</span>
              {c.description && (
                <span className="block truncate text-sm text-text-secondary">{c.description}</span>
              )}
            </span>
            <span className="tnum hidden shrink-0 text-xs text-text-tertiary sm:block">
              {t("collections.updated")}: {formatDate(c.updatedAt)}
            </span>
            <span className="tnum shrink-0 text-xs text-text-tertiary">
              {t("common.itemsCount", { count: counts?.[c.id] ?? 0 })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** S8 /collections/:id */
export function CollectionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openCollectionForm, openConfirm } = useModals();
  const [sort, setSort] = useState<"recent" | "title">("recent");

  const { data: collection, isPending } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => api.getCollection(id!),
    enabled: Boolean(id),
  });

  const { data: items } = useQuery({
    queryKey: ["collection-items", id],
    queryFn: async () => {
      const page = await api.listItems({ limit: 1000 });
      return page.items.filter((i) => i.collectionIds.includes(id!));
    },
    enabled: Boolean(id),
  });

  const sorted = [...(items ?? [])].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["collection-items", id] });
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
    void queryClient.invalidateQueries({ queryKey: ["collection", id] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const removeItem = async (itemId: string) => {
    await api.removeFromCollection([itemId], id!);
    invalidate();
    toast.toast({ variant: "success", message: t("collections.removedFrom") });
  };

  const deleteCollection = () => {
    openConfirm({
      title: t("collections.deleteTitle"),
      body: t("collections.deleteBody"),
      confirmLabel: t("common.delete"),
      danger: true,
      onConfirm: async () => {
        await api.deleteCollection(id!);
        navigate("/collections");
      },
    });
  };

  if (isPending || !collection) {
    return (
      <div className="mx-auto w-full max-w-feed flex-1 px-3 py-4">
        <ItemCardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-feed flex-1 px-3 pb-8">
      <button
        type="button"
        onClick={() => navigate("/collections")}
        className="mt-3 text-sm text-text-secondary hover:text-text"
      >
        ← {t("collections.title")}
      </button>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text">{collection.name}</h1>
          {collection.description && (
            <p className="mt-1 text-base text-text-secondary">{collection.description}</p>
          )}
          <p className="tnum mt-1 text-xs text-text-tertiary">
            {t("common.itemsCount", { count: sorted.length })} · {t("collections.updated")}: {formatDate(collection.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openCollectionForm(collection)}>
            {t("common.edit")}
          </Button>
          <Button size="sm" variant="danger" onClick={deleteCollection}>
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm text-text-tertiary" htmlFor="col-sort">
          {t("collections.sortLabel")}
        </label>
        <select
          id="col-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as "recent" | "title")}
          className="h-8 rounded-control border border-border-strong bg-surface px-2 text-sm text-text"
        >
          <option value="recent">{t("collections.sortRecent")}</option>
          <option value="title">{t("collections.sortTitle")}</option>
        </select>
      </div>

      <div className="mt-3 overflow-hidden rounded-dialog border border-border bg-surface">
        {sorted.length === 0 && (
          <p className="p-8 text-center text-base text-text-secondary">{t("collections.empty")}</p>
        )}
        <ul>
          {sorted.map((item) => (
            <li key={item.id} className="flex items-center gap-2 border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => navigate(`/items/${item.id}`)}
                className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-surface-subtle"
              >
                <span className="block truncate text-base font-medium text-text">{item.title}</span>
                <time className="tnum block text-xs text-text-tertiary" dateTime={item.capturedAt}>
                  {formatDate(item.capturedAt)}
                </time>
              </button>
              <button
                type="button"
                onClick={() => void removeItem(item.id)}
                aria-label={`${t("collections.removeFromCollection")}: ${item.title}`}
                title={t("collections.removeFromCollection")}
                className="mr-3 shrink-0 rounded p-1.5 text-text-tertiary hover:bg-surface-subtle hover:text-danger"
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
