import { cn } from "../lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Single-row segmented control (spec S4 filters, S6 search modes). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-control border border-border bg-surface-subtle p-1 [scrollbar-width:none]",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 shrink-0 whitespace-nowrap rounded-[4px] px-3 text-sm font-medium transition-colors duration-150 ease-out max-sm:h-8",
              selected
                ? "bg-surface text-text shadow-[0_1px_2px_rgb(0_0_0/0.08)] border border-border"
                : "border border-transparent text-text-secondary hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Static loading skeleton (no shimmer animation per spec). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-control bg-surface-subtle", className)} />;
}

export function ItemCardSkeleton() {
  return (
    <div className="border-b border-border px-4 py-3" aria-hidden>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-2/3" />
    </div>
  );
}

/** Initials avatar — the only fully-rounded shape allowed (spec section 8). */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-subtle font-semibold text-accent"
    >
      {initials || "?"}
    </span>
  );
}
