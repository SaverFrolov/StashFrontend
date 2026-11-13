import type { ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 border-b border-border", className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="border-b-2 border-transparent px-3 py-2 text-base font-medium text-text-secondary transition-colors duration-150 ease-out hover:text-text data-[state=active]:border-accent data-[state=active]:text-text"
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn("outline-none", className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-9 max-sm:h-11 w-full items-center justify-between gap-2 rounded-control border border-border-strong bg-surface px-3 text-base text-text hover:bg-surface-subtle",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} strokeWidth={1.5} className="text-text-tertiary" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-dialog border border-border bg-surface p-1 shadow-pop"
        >
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between rounded-control px-2 py-2 text-base text-text outline-none select-none data-[highlighted]:bg-surface-subtle data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={14} strokeWidth={2} className="text-accent" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
