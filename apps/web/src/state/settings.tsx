import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type ThemeMode = "system" | "light" | "dark";

const THEME_KEY = "inbox-theme";

interface SettingsContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  // Language lives in state, synced via the languageChanged event: the i18n
  // instance reference is stable, so reading resolvedLanguage inside useMemo
  // would never refresh and consumers (e.g. the RU/EN selector highlight)
  // would keep the previous language.
  const [language, setLanguageState] = useState<string>(() => i18n.resolvedLanguage ?? "ru");

  useEffect(() => {
    const handler = (lng: string) => setLanguageState(lng);
    i18n.on("languageChanged", handler);
    setLanguageState(i18n.resolvedLanguage ?? "ru");
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);

  const setLanguage = useCallback(
    (lang: string) => {
      void i18n.changeLanguage(lang);
    },
    [i18n],
  );

  const value = useMemo(
    () => ({ theme, setTheme, language, setLanguage }),
    [theme, setTheme, language, setLanguage],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

/** Live online/offline status (spec: offline banner + offline system state). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Media-query hook used for the >=1280px detail-pane layout switch. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
