import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitMerge, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  ItemCardSkeleton,
  Select,
  useToast,
} from "@inbox/ui";
import type { Tag } from "@inbox/api-client";
import { useApi } from "../state/api";
import { useModals } from "../modals/ModalProvider";

/** S9 /tags: table with tag, item count, origin, actions rename/merge/delete. */
export function TagsScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openConfirm } = useModals();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");

  const [renameTag, setRenameTag] = useState<Tag | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState("");

  const { data: tags, isPending } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });
  const { data: counts } = useQuery({
    queryKey: ["tag-counts"],
    queryFn: async () => {
      const page = await api.listItems({ limit: 1000 });
      const map: Record<string, number> = {};
      for (const item of page.items) {
        const names = new Set([...item.userTags, ...item.suggestedTags, ...item.ai.tags]);
        for (const n of names) map[n] = (map[n] ?? 0) + 1;
      }
      return map;
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["tag-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameTag(id, name),
    onSuccess: () => {
      invalidate();
      setRenameTag(null);
      toast.toast({ variant: "success", message: t("tags.renamed") });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const sources = [...mergeSelection].filter((id) => id !== mergeTarget);
      await api.mergeTags(sources, mergeTarget);
    },
    onSuccess: () => {
      invalidate();
      setMergeOpen(false);
      setMergeSelection(new Set());
      setMergeTarget("");
      toast.toast({ variant: "success", message: t("tags.merged") });
    },
  });

  const deleteTag = (tag: Tag) => {
    openConfirm({
      title: t("tags.deleteTitle"),
      body: t("tags.deleteBody"),
      confirmLabel: t("common.delete"),
      danger: true,
      onConfirm: async () => {
        await api.deleteTag(tag.id);
        invalidate();
        toast.toast({ variant: "success", message: t("tags.deleted") });
      },
    });
  };

  const sortedTags = useMemo(() => [...(tags ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [tags]);

  return (
    <div className="mx-auto w-full max-w-feed flex-1 px-3 pb-8">
      <div className="mt-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-text">{t("tags.title")}</h1>
        <Button
          size="sm"
          disabled={mergeSelection.size < 2}
          onClick={() => {
            setMergeTarget([...mergeSelection][0]);
            setMergeOpen(true);
          }}
        >
          <GitMerge size={14} strokeWidth={1.5} aria-hidden />
          {t("common.merge")}
        </Button>
      </div>

      {isPending && (
        <div aria-hidden className="mt-4">
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </div>
      )}

      {!isPending && sortedTags.length === 0 && (
        <p className="mt-8 text-center text-base text-text-secondary">{t("tags.empty")}</p>
      )}

      {sortedTags.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-dialog border border-border bg-surface">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs text-text-tertiary">
                <th scope="col" className="w-10 px-3 py-2">
                  <span className="sr-only">{t("common.merge")}</span>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("tags.columnTag")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("tags.columnCount")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("tags.columnOrigin")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">{t("common.edit")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTags.map((tag) => (
                <tr
                  key={tag.id}
                  className={
                    highlight === tag.name
                      ? "border-b border-border bg-accent-subtle last:border-b-0"
                      : "border-b border-border last:border-b-0 hover:bg-surface-subtle"
                  }
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={mergeSelection.has(tag.id)}
                      onCheckedChange={(checked) => {
                        setMergeSelection((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(tag.id);
                          else next.delete(tag.id);
                          return next;
                        });
                      }}
                      id={`merge-${tag.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(tag.name)}`)}
                      className="text-base font-medium text-text hover:text-accent"
                    >
                      {tag.name}
                    </button>
                  </td>
                  <td className="tnum px-3 py-2 text-base text-text-secondary">{counts?.[tag.name] ?? 0}</td>
                  <td className="px-3 py-2 text-sm text-text-tertiary">
                    {tag.origin === "user" ? t("tags.originUser") : t("tags.originAi")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("common.rename")}: ${tag.name}`}
                        onClick={() => {
                          setRenameTag(tag);
                          setRenameValue(tag.name);
                        }}
                      >
                        <Pencil size={14} strokeWidth={1.5} aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("common.delete")}: ${tag.name}`}
                        className="text-danger"
                        onClick={() => deleteTag(tag)}
                      >
                        <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* M5: rename tag */}
      <Dialog open={renameTag !== null} onOpenChange={(o) => !o && setRenameTag(null)}>
        <DialogContent title={t("tags.renameTitle")} closeLabel={t("common.close")}>
          <Field label={t("tags.columnTag")} htmlFor="rename-tag">
            <Input
              id="rename-tag"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameTag && renameValue.trim()) {
                  renameMutation.mutate({ id: renameTag.id, name: renameValue.trim() });
                }
              }}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTag(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() => renameTag && renameMutation.mutate({ id: renameTag.id, name: renameValue.trim() })}
            >
              {t("common.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* M5: merge tags */}
      <Dialog open={mergeOpen} onOpenChange={(o) => !o && setMergeOpen(false)}>
        <DialogContent title={t("tags.mergeTitle")} closeLabel={t("common.close")}>
          <p className="text-base text-text-secondary">{t("tags.mergeSelect")}</p>
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {sortedTags
              .filter((tag) => mergeSelection.has(tag.id))
              .map((tag) => (
                <li key={tag.id} className="text-base text-text">
                  {tag.name}
                </li>
              ))}
          </ul>
          <Field label={t("tags.mergeTarget")} htmlFor="merge-target">
            <Select
              ariaLabel={t("tags.mergeTarget")}
              value={mergeTarget || undefined}
              onValueChange={setMergeTarget}
              options={sortedTags
                .filter((tag) => mergeSelection.has(tag.id))
                .map((tag) => ({ value: tag.id, label: tag.name }))}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={!mergeTarget || mergeMutation.isPending}
              onClick={() => mergeMutation.mutate()}
            >
              {t("common.merge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
