import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button, Checkbox, Dialog, DialogContent, DialogFooter, Field, Select, useToast } from "@inbox/ui";
import type { ExportOptions } from "@inbox/api-client";
import { features } from "@inbox/api-client";
import { useApi } from "../state/api";

/** M7: scope, format, include-checkboxes, progress, download. */
export function ExportDialog({
  open,
  scope = "all",
  collectionId,
  itemIds,
  onClose,
}: {
  open: boolean;
  scope?: ExportOptions["scope"];
  collectionId?: string;
  itemIds?: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const [chosenScope, setChosenScope] = useState<ExportOptions["scope"]>(scope);
  const [chosenCollection, setChosenCollection] = useState(collectionId ?? "");
  const [format, setFormat] = useState<"json" | "markdown">("json");
  const [includeOriginals, setIncludeOriginals] = useState(true);
  const [includeExtracted, setIncludeExtracted] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.listCollections(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setChosenScope(scope);
      setChosenCollection(collectionId ?? "");
      setProgress(0);
    }
  }, [open, scope, collectionId]);

  if (!features.export) return null;

  const runExport = async () => {
    setBusy(true);
    setProgress(10);
    try {
      const timer = window.setInterval(() => {
        setProgress((p) => Math.min(p + 15, 90));
      }, 200);
      const result = await api.exportData({
        scope: chosenScope,
        collectionId: chosenScope === "collection" ? chosenCollection : undefined,
        itemIds: chosenScope === "selected" ? itemIds : undefined,
        format,
        includeOriginals,
        includeExtracted,
        includeAi,
        includeComments,
      });
      window.clearInterval(timer);
      setProgress(100);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.toast({ variant: "success", message: t("modals.exportDone") });
      onClose();
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const canRun =
    chosenScope !== "collection" || Boolean(chosenCollection);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("modals.exportTitle")} closeLabel={t("common.close")}>
        <Field label={t("modals.exportScope")} htmlFor="export-scope">
          <Select
            ariaLabel={t("modals.exportScope")}
            value={chosenScope}
            onValueChange={(v) => setChosenScope(v as ExportOptions["scope"])}
            options={[
              { value: "all", label: t("modals.exportScopeAll") },
              { value: "collection", label: t("modals.exportScopeCollection") },
              ...(itemIds && itemIds.length > 0
                ? [{ value: "selected", label: t("modals.exportScopeSelected") }]
                : []),
            ]}
          />
        </Field>

        {chosenScope === "collection" && (
          <Field label={t("shell.collections")} htmlFor="export-collection">
            <Select
              ariaLabel={t("shell.collections")}
              value={chosenCollection || undefined}
              onValueChange={setChosenCollection}
              placeholder={t("shell.collections")}
              options={(collections ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        )}

        <Field label={t("modals.exportFormat")} htmlFor="export-format">
          <Select
            ariaLabel={t("modals.exportFormat")}
            value={format}
            onValueChange={(v) => setFormat(v as "json" | "markdown")}
            options={[
              { value: "json", label: t("modals.exportFormatJson") },
              { value: "markdown", label: t("modals.exportFormatMarkdown") },
            ]}
          />
        </Field>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium text-text-secondary">{t("modals.exportInclude")}</legend>
          <Checkbox checked={includeOriginals} onCheckedChange={setIncludeOriginals} label={t("modals.exportIncludeOriginals")} id="exp-orig" />
          <Checkbox checked={includeExtracted} onCheckedChange={setIncludeExtracted} label={t("modals.exportIncludeExtracted")} id="exp-extr" />
          <Checkbox checked={includeAi} onCheckedChange={setIncludeAi} label={t("modals.exportIncludeAi")} id="exp-ai" />
          <Checkbox checked={includeComments} onCheckedChange={setIncludeComments} label={t("modals.exportIncludeComments")} id="exp-comm" />
        </fieldset>

        {busy && (
          <div
            className="h-1 w-full rounded bg-surface-subtle"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("modals.exportInProgress")}
          >
            <div className="h-full rounded bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>
        )}

        <p className="text-xs text-text-tertiary">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            {t("modals.exportDocs")}
          </a>
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void runExport()} disabled={busy || !canRun}>
            {busy ? t("modals.exportInProgress") : t("modals.exportRun")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
