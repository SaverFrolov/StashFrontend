import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface CondensedContextValue {
  condensed: boolean;
  setCondensed: (value: boolean) => void;
}

const CondensedContext = createContext<CondensedContextValue | null>(null);

/**
 * Shared state for the condensing feed filter bar: the Feed observes its
 * scroll container and flips `condensed`; AppShell reflects it as
 * data-condensed on the header. Same DOM node for the bar in both states —
 * only CSS positioning changes (no reparenting, focus is preserved).
 */
export function CondensedProvider({ children }: { children: ReactNode }) {
  const [condensed, setCondensed] = useState(false);
  const value = useMemo(() => ({ condensed, setCondensed }), [condensed]);
  return <CondensedContext.Provider value={value}>{children}</CondensedContext.Provider>;
}

/** Returns null outside the provider (e.g. compact feed in the detail pane). */
export function useCondensedHeader(): CondensedContextValue | null {
  return useContext(CondensedContext);
}
