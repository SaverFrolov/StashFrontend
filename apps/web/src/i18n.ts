import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Adding a locale = adding a new JSON file under src/locales and registering
 * it in `resources` below. Nothing else references individual strings.
 */
export function initI18n(): void {
  if (i18n.isInitialized) return;
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ru: { translation: ru },
        en: { translation: en },
      },
      fallbackLng: "ru",
      supportedLngs: [...SUPPORTED_LANGUAGES],
      load: "currentOnly",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "inbox-language",
        caches: ["localStorage"],
      },
    });
  applyLangAttribute(i18n.resolvedLanguage ?? "ru");
  i18n.on("languageChanged", (lng) => applyLangAttribute(lng));
}

function applyLangAttribute(lng: string): void {
  document.documentElement.lang = lng;
}

export default i18n;
