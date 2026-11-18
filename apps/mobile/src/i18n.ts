import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import ru from "@inbox/locales/ru";
import en from "@inbox/locales/en";
import { LANGUAGE_KEY, mmkv } from "./storage";

export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupported(code: string | null | undefined): code is AppLanguage {
  return code === "ru" || code === "en";
}

function detectDeviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? null;
  return isSupported(code) ? code : "ru";
}

export function initI18n(): void {
  if (i18n.isInitialized) return;
  const stored = mmkv.getString(LANGUAGE_KEY);
  const lng = isSupported(stored) ? stored : detectDeviceLanguage();
  void i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng,
    fallbackLng: "ru",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    load: "currentOnly",
    interpolation: { escapeValue: false },
    // Same hardening as web: synchronous init, no suspense.
    initImmediate: false,
    react: { useSuspense: false },
  });
}

export function setAppLanguage(lang: AppLanguage): void {
  mmkv.set(LANGUAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

export function currentLanguage(): AppLanguage {
  return i18n.resolvedLanguage === "en" ? "en" : "ru";
}

export default i18n;
