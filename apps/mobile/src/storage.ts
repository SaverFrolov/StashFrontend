import { createMMKV } from "react-native-mmkv";

/** App-wide MMKV instance: drafts, settings. Synchronous — no theme/i18n flash at startup. */
export const mmkv = createMMKV({ id: "stash-app" });

export const THEME_KEY = "app-theme";
export const LANGUAGE_KEY = "app-language";
export const COMPOSER_DRAFT_KEY = "app-composer-draft";
