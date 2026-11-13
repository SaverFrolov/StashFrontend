import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Inbox as InboxIcon,
  PenLine,
} from "lucide-react";
import type { ItemStatus } from "@inbox/api-client/types";
import { statusMeta } from "../lib/status-meta";
import { cn } from "../lib/cn";

const icons = {
  inbox: InboxIcon,
  download: Download,
  "pen-line": PenLine,
  "check-circle": CheckCircle2,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
} as const;

const toneClasses = {
  neutral: "text-text-secondary border-border-strong",
  progress: "text-text-secondary border-border-strong",
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  danger: "text-danger border-danger/40",
} as const;

/**
 * Status chip: always icon + plain text, never colour alone (WCAG).
 * Pass `label` from i18n: t(statusLabelKey(status)).
 */
export function StatusChip({
  status,
  label,
  compact,
  className,
}: {
  status: ItemStatus;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const meta = statusMeta(status);
  const Icon = icons[meta.icon];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-control border px-1.5 text-xs leading-none",
        toneClasses[meta.tone],
        className,
      )}
      role="status"
    >
      <Icon size={compact ? 12 : 14} strokeWidth={1.5} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
