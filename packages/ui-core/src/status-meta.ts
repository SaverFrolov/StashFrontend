import type { ItemStatus } from "@inbox/api-client/types";

export type StatusTone = "neutral" | "progress" | "success" | "warning" | "danger";

export interface StatusMeta {
  /** i18n key of the plain-text status label */
  labelKey: string;
  /** tone is a hint only — status is always icon + text, never colour alone */
  tone: StatusTone;
  /** lucide icon name used by StatusChip */
  icon:
    | "inbox"
    | "download"
    | "pen-line"
    | "check-circle"
    | "alert-circle"
    | "alert-triangle";
  /** in-progress statuses animate nothing; they show a static icon */
  inProgress: boolean;
}

export const STATUS_META: Record<ItemStatus, StatusMeta> = {
  saved: { labelKey: "status.saved", tone: "neutral", icon: "inbox", inProgress: true },
  extracting: { labelKey: "status.extracting", tone: "progress", icon: "download", inProgress: true },
  annotating: { labelKey: "status.annotating", tone: "progress", icon: "pen-line", inProgress: true },
  done: { labelKey: "status.done", tone: "success", icon: "check-circle", inProgress: false },
  partial: { labelKey: "status.partial", tone: "warning", icon: "alert-circle", inProgress: false },
  extraction_failed: { labelKey: "status.extractionFailed", tone: "danger", icon: "alert-triangle", inProgress: false },
  ai_failed: { labelKey: "status.aiFailed", tone: "danger", icon: "alert-triangle", inProgress: false },
};

export function statusMeta(status: ItemStatus): StatusMeta {
  return STATUS_META[status];
}

export function statusLabelKey(status: ItemStatus): string {
  return STATUS_META[status].labelKey;
}

/** Statuses that need the user's attention (sidebar counter, filter). */
export const ATTENTION_STATUS_LIST: ItemStatus[] = ["partial", "extraction_failed", "ai_failed"];

export function needsAttention(status: ItemStatus): boolean {
  return ATTENTION_STATUS_LIST.includes(status);
}
