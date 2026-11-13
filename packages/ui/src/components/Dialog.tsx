import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Centered dialog on desktop; bottom sheet on mobile (per spec section 6).
 * Focus trap and restore are handled by Radix.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
  closeLabel = "Close",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-dialog border border-border bg-surface p-6 shadow-pop",
          "inset-x-0 bottom-0",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-dialog",
          "pb-[max(24px,env(safe-area-inset-bottom))]",
          className,
        )}
        aria-describedby={description ? undefined : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-lg font-semibold text-text">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-base text-text-secondary">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="-mr-2 -mt-1 rounded-control p-2 text-text-secondary hover:bg-surface-subtle"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-2 flex flex-wrap justify-end gap-2", className)}>{children}</div>
  );
}
