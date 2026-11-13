import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid outline = confirmed/user tag; dashed = AI suggestion */
  dashed?: boolean;
  active?: boolean;
  children: ReactNode;
  as?: "button" | "span";
}

export function Chip({ dashed, active, className, children, as = "button", ...props }: ChipProps) {
  const classes = cn(
    "inline-flex h-6 max-w-full items-center gap-1 rounded-control px-2 text-xs leading-none transition-colors duration-150 ease-out",
    dashed ? "border border-dashed border-border-strong text-text-secondary" : "border border-border-strong text-text-secondary",
    active && "border-accent bg-accent-subtle text-accent",
    as === "button" && "hover:bg-surface-subtle disabled:opacity-50",
    className,
  );
  if (as === "span") return <span className={classes}>{children}</span>;
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function TagChip({
  label,
  suggested,
  onAccept,
  onRemove,
  acceptLabel,
  removeLabel,
}: {
  label: string;
  suggested?: boolean;
  onAccept?: () => void;
  onRemove?: () => void;
  acceptLabel?: string;
  removeLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-control border px-2 text-xs leading-none",
        suggested ? "border-dashed border-border-strong text-text-secondary" : "border-border-strong text-text",
      )}
    >
      {label}
      {suggested && onAccept && (
        <button
          type="button"
          onClick={onAccept}
          aria-label={`${acceptLabel ?? "Accept"}: ${label}`}
          title={acceptLabel}
          className="-mr-1 rounded-[3px] px-0.5 text-text-tertiary hover:bg-surface-subtle hover:text-accent"
        >
          +
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${removeLabel ?? "Remove"}: ${label}`}
          title={removeLabel}
          className="-mr-1 rounded-[3px] px-0.5 text-text-tertiary hover:bg-surface-subtle hover:text-danger"
        >
          ×
        </button>
      )}
    </span>
  );
}
