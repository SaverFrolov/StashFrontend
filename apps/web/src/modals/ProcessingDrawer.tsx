import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Button, Dialog, DialogContent, cn } from "@inbox/ui";
import type { Item, ProcessingStep } from "@inbox/api-client";
import { formatDateTime } from "../lib/format";

const stepIcons = {
  pending: <Clock size={16} strokeWidth={1.5} aria-hidden />,
  running: <CircleDashed size={16} strokeWidth={1.5} aria-hidden />,
  ok: <CheckCircle2 size={16} strokeWidth={1.5} className="text-success" aria-hidden />,
  failed: <AlertTriangle size={16} strokeWidth={1.5} className="text-danger" aria-hidden />,
  skipped: <SkipForward size={16} strokeWidth={1.5} aria-hidden />,
} as const;

const statusKeys: Record<ProcessingStep["status"], string> = {
  pending: "item.stepPending",
  running: "item.stepRunning",
  ok: "item.stepOk",
  failed: "item.stepFailed",
  skipped: "item.stepSkipped",
};

/** M8: right-side drawer with processing steps, timestamps, errors, Retry. */
export function ProcessingDrawer({
  open,
  item,
  onClose,
  onRetry,
}: {
  open: boolean;
  item?: Item;
  onClose: () => void;
  onRetry?: (item: Item) => void;
}) {
  const { t } = useTranslation();
  if (!item) return null;

  const hasFailed = item.processing.some((s) => s.status === "failed");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t("modals.processingTitle")}
        closeLabel={t("common.close")}
        className="sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-dvh sm:max-w-[400px] sm:translate-x-0 sm:translate-y-0 sm:rounded-l-dialog sm:rounded-r-none"
      >
        <ol className="flex flex-col gap-3" aria-label={t("item.processingDetails")}>
          {item.processing.map((step, i) => (
            <li key={`${step.name}-${i}`} className="flex gap-3 rounded-control border border-border p-3">
              <span className="mt-0.5 shrink-0 text-text-secondary">{stepIcons[step.status]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-text">
                  {step.name === "extract" ? t("item.stepExtract") : t("item.stepAnnotate")}
                </p>
                <p className={cn("text-sm", step.status === "failed" ? "text-danger" : "text-text-secondary")}>
                  {t(statusKeys[step.status])}
                </p>
                {step.startedAt && (
                  <p className="tnum mt-1 text-xs text-text-tertiary">
                    {formatDateTime(step.startedAt)}
                    {step.finishedAt && ` → ${formatDateTime(step.finishedAt)}`}
                  </p>
                )}
                {step.error && (
                  <p className="mt-1 flex items-start gap-1 text-sm text-danger">
                    <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
                    {step.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {hasFailed && onRetry && (
          <div className="mt-2">
            <Button variant="secondary" onClick={() => onRetry(item)}>
              <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
              {t("common.retry")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
