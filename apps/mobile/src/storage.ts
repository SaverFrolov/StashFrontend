import { createMMKV } from "react-native-mmkv";
import type { StorageAdapter } from "@inbox/api-client";

/** App-wide MMKV instance: mock DB, drafts, settings. Synchronous — no theme/i18n flash at startup. */
export const mmkv = createMMKV({ id: "stash-app" });

/** StorageAdapter for MockApi — the mobile counterpart of web's localStorage. */
export const mmkvStorage: StorageAdapter = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => {
    mmkv.set(key, value);
  },
  removeItem: (key) => {
    mmkv.remove(key);
  },
};

export const THEME_KEY = "app-theme";
export const LANGUAGE_KEY = "app-language";
export const COMPOSER_DRAFT_KEY = "app-composer-draft";
