import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkTokens, lightTokens } from "@inbox/ui-core";
import type { ThemeTokens } from "@inbox/ui-core";
import { THEME_KEY, mmkv } from "../storage";

export type ThemeMode = "system" | "light" | "dark";

/** Static Inter font faces (loaded via @expo-google-fonts/inter in the root layout). */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const;

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolved theme after applying the system preference */
  theme: "light" | "dark";
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  const stored = mmkv.getString(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Synchronous MMKV read in the initializer — no wrong-theme flash at startup.
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const theme: "light" | "dark" =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const tokens = theme === "dark" ? darkTokens : lightTokens;

  const setMode = useCallback((next: ThemeMode) => {
    mmkv.set(THEME_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, theme, tokens }),
    [mode, setMode, theme, tokens],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
