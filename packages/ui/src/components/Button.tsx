import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-accent-hover text-white border border-transparent shadow-glow hover:brightness-110 disabled:opacity-50",
  secondary:
    "bg-surface text-text border border-glass-border shadow-pop hover:bg-surface-subtle",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-surface-subtle hover:text-text",
  danger:
    "bg-surface text-danger border border-glass-border hover:bg-danger/10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-9 max-sm:h-11 select-none items-center justify-center gap-2 rounded-control border font-medium transition-[opacity,background-color,color] duration-150 ease-out disabled:cursor-not-allowed",
        size === "md" ? "px-4 text-base" : "h-7 max-sm:h-9 px-2 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, variant = "ghost", size = "md", className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center rounded-control transition-[background-color,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
          size === "md" ? "h-9 w-9 max-sm:h-11 max-sm:w-11" : "h-7 w-7",
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
