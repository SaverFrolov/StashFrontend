import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button, Checkbox, Dialog, DialogContent, DialogFooter, Input, useToast } from "@inbox/ui";
import { useApi } from "../state/api";

/** M2: search field, checkbox list, "Create collection '...'" row. */
export function AddToCollectionDialog({
  open,
  itemIds,
  onClose,
}: {
  open: boolean;
  itemIds: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.listCollections(),
    enabled: open,
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

  const addMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      await api.addToCollection(itemIds, collectionId);
    },
    onSuccess: (_data, collectionId) => {
      const name = (collections ?? []).find((c) => c.id === collectionId)?.name ?? "";
      toast.toast({ variant: "success", message: t("collections.addedTo", { name }) });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["item"] });
      setSelected(new Set());
      setQuery("");
      onClose();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const col = await api.createCollection(name);
      await api.addToCollection(itemIds, col.id);
      return col;
    },
    onSuccess: (col) => {
      toast.toast({ variant: "success", message: t("collections.addedTo", { name: col.name }) });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["item"] });
      setCreating(false);
      setQuery("");
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelected(new Set());
          setQuery("");
          setCreating(false);
          onClose();
        }
      }}
    >
      <DialogContent title={t("modals.addToCollectionTitle")} closeLabel={t("common.close")}>
        <div className="relative">
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("modals.collectionSearch")}
            aria-label={t("modals.collectionSearch")}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="-mx-2 max-h-64 overflow-y-auto px-2" role="group" aria-label={t("shell.collections")}>
          {filtered.length === 0 && !query.trim() && (
            <p className="py-4 text-center text-base text-text-tertiary">{t("modals.noCollections")}</p>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="border-b border-border py-2 last:border-b-0">
              <Checkbox
                checked={selected.has(c.id)}
                onCheckedChange={(checked) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(c.id);
                    else next.delete(c.id);
                    return next;
                  });
                }}
                label={c.name}
                id={`add-col-${c.id}`}
              />
            </div>
          ))}

          {query.trim() && !exactMatch && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-control py-2 text-base text-accent hover:bg-surface-subtle"
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              {t("modals.createCollectionRow", { name: query.trim() })}
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {creating && query.trim() ? (
            <Button
              variant="primary"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(query.trim())}
            >
              {t("common.create")}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={selected.size === 0 || addMutation.isPending}
              onClick={async () => {
                for (const cid of selected) {
                  await addMutation.mutateAsync(cid);
                }
              }}
            >
              {t("common.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
