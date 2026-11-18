import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { File as FileIcon, Upload, X } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, Field, Textarea, cn, useToast } from "@inbox/ui";
import { FILE_ACCEPT_ATTR, isAllowedUploadFile } from "@inbox/api-client";
import { useApi } from "../state/api";
import { formatBytes } from "../lib/format";

interface UploadEntry {
  id: string;
  file: File;
  progress: number;
  error?: string;
  done: boolean;
}

function validate(file: File, t: (k: string, o?: Record<string, unknown>) => string): string | undefined {
  if (!isAllowedUploadFile(file)) {
    return t("modals.uploadInvalidType");
  }
  return undefined;
}

export function UploadDialog({
  open,
  presetComment,
  presetFiles,
  onClose,
}: {
  open: boolean;
  presetComment?: string;
  presetFiles?: File[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [comment, setComment] = useState(presetComment ?? "");
  const [uploading, setUploading] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setComment(presetComment ?? "");
      setEntries(
        (presetFiles ?? []).map((f, i) => ({
          id: `preset-${i}`,
          file: f,
          progress: 0,
          done: false,
          error: validate(f, t),
        })),
      );
    }
  }, [open, presetFiles, presetComment, t]);

  const addFiles = (files: FileList | File[]) => {
    const next: UploadEntry[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      progress: 0,
      done: false,
      error: validate(f, t),
    }));
    setEntries((prev) => [...prev, ...next]);
  };

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const startUpload = async () => {
    setUploading(true);
    let okCount = 0;
    for (const entry of entries) {
      if (entry.done || entry.error) continue;
      try {
        // Simulated per-file progress
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, progress: 40 } : e)));
        const dataUrl = await toDataUrl(entry.file);
        await api.saveFile({
          file: { uri: dataUrl, name: entry.file.name, mimeType: entry.file.type || "application/pdf", size: entry.file.size },
          comment: comment || undefined,
        });
        okCount += 1;
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, progress: 100, done: true } : e)));
      } catch {
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, error: t("modals.uploadFailed") } : e)),
        );
      }
    }
    setUploading(false);
    if (okCount > 0) {
      toast.toast({ variant: "success", message: t("modals.uploadDone") });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
      onClose();
    }
  };

  const validPending = entries.filter((e) => !e.done && !e.error).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("modals.uploadTitle")} closeLabel={t("common.close")}>
        <div
          ref={dragRef}
          role="button"
          tabIndex={0}
          aria-label={t("modals.uploadDrop")}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            dragRef.current?.classList.add("border-accent");
          }}
          onDragLeave={() => dragRef.current?.classList.remove("border-accent")}
          onDrop={(e) => {
            e.preventDefault();
            dragRef.current?.classList.remove("border-accent");
            addFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-dialog border-2 border-dashed border-border-strong bg-surface-subtle px-6 py-8 text-center hover:border-accent"
        >
          <Upload size={20} strokeWidth={1.5} className="text-text-tertiary" aria-hidden />
          <span className="text-base text-text">{t("modals.uploadDrop")}</span>
          <span className="text-xs text-text-tertiary">{t("modals.uploadAllowed")}</span>
          <input
            ref={inputRef}
            type="file"
            accept={FILE_ACCEPT_ATTR}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {entries.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label={t("modals.uploadTitle")}>
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-control border border-border px-2 py-2">
                <FileIcon size={16} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{e.file.name}</span>
                  <span className={cn("block text-xs", e.error ? "text-danger" : "text-text-tertiary")}>
                    {e.error ?? formatBytes(e.file.size)}
                  </span>
                  {!e.done && !e.error && e.progress > 0 && (
                    <span
                      className="mt-1 block h-0.5 w-full rounded bg-surface-subtle"
                      role="progressbar"
                      aria-valuenow={e.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={e.file.name}
                    >
                      <span className="block h-full rounded bg-accent transition-[width] duration-150" style={{ width: `${e.progress}%` }} />
                    </span>
                  )}
                </span>
                {e.done && <span className="shrink-0 text-xs text-success">{t("modals.uploadDone")}</span>}
                <button
                  type="button"
                  aria-label={`${t("common.delete")}: ${e.file.name}`}
                  className="shrink-0 rounded p-1 text-text-tertiary hover:text-danger"
                  onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                >
                  <X size={14} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Field label={t("modals.uploadComment")} htmlFor="upload-comment">
          <Textarea
            id="upload-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void startUpload()} disabled={uploading || validPending === 0}>
            {uploading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
