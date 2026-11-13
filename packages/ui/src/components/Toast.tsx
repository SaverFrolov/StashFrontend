import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

export type ToastVariant = "success" | "error" | "undo";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let counter = 0;

/**
 * Toasts: bottom-centre on desktop, top on mobile (spec section 6).
 * Variants: success, error, undo.
 */
export function ToastProvider({ children, undoLabelDefault = "Undo" }: { children: ReactNode; undoLabelDefault?: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    counter += 1;
    const id = `toast-${counter}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPrimitive.Provider swipeDirection="down">
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.durationMs ?? (t.variant === "undo" ? 8000 : 4000)}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              "flex items-center gap-3 rounded-dialog border border-border bg-surface px-4 py-3 text-base text-text shadow-pop",
              "data-[state=open]:animate-[toast-in_150ms_ease-out]",
            )}
          >
            {t.variant === "success" && <CheckCircle2 size={18} className="shrink-0 text-success" strokeWidth={1.5} aria-hidden />}
            {t.variant === "error" && <XCircle size={18} className="shrink-0 text-danger" strokeWidth={1.5} aria-hidden />}
            {t.variant === "undo" && <XCircle size={18} className="shrink-0 text-text-secondary" strokeWidth={1.5} aria-hidden />}
            <ToastPrimitive.Description className="min-w-0 flex-1">{t.message}</ToastPrimitive.Description>
            {t.variant === "undo" && t.onUndo && (
              <ToastPrimitive.Action
                asChild
                altText={t.undoLabel ?? undoLabelDefault}
              >
                <button
                  type="button"
                  onClick={t.onUndo}
                  className="rounded-control border border-border-strong px-2 py-1 text-sm font-medium text-accent hover:bg-surface-subtle"
                >
                  {t.undoLabel ?? undoLabelDefault}
                </button>
              </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close
              aria-label="Close"
              className="rounded-control p-1 text-text-tertiary hover:bg-surface-subtle"
            >
              <X size={14} strokeWidth={1.5} aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            "fixed z-[100] flex w-[calc(100vw-32px)] max-w-[420px] flex-col gap-2 outline-none",
            // desktop: bottom-centre
            "bottom-4 left-1/2 -translate-x-1/2",
            // mobile: top
            "max-sm:bottom-auto max-sm:top-4 max-sm:mt-[env(safe-area-inset-top)]",
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
