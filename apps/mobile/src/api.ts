import * as SecureStore from "expo-secure-store";
import { MockApi, RestApi, config } from "@inbox/api-client";
import type { ApiClient, Session } from "@inbox/api-client";
import { mmkvStorage } from "./storage";

type ItemUpdatedListener = (id: string) => void;

const listeners = new Set<ItemUpdatedListener>();

/**
 * Subscribe to mock pipeline item updates (the mobile counterpart of the
 * web's `inbox:mock-item-updated` window event). Returns an unsubscribe fn.
 */
export function onItemUpdated(listener: ItemUpdatedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let client: ApiClient | null = null;

/** RestApi when EXPO_PUBLIC_API_BASE_URL is set, MockApi (MMKV-backed) otherwise. */
export function getApiClient(): ApiClient {
  if (!client) {
    client = config.apiBaseUrl
      ? new RestApi(config.apiBaseUrl)
      : new MockApi({
          storage: mmkvStorage,
          onItemUpdated: (id) => {
            listeners.forEach((listener) => listener(id));
          },
        });
  }
  return client;
}

const SESSION_STORE_KEY = "auth-session";

/**
 * Restore the persisted session at startup. MockApi restores itself from its
 * MMKV storage; RestApi keeps the session in memory only, so mobile persists
 * it in SecureStore (expo-secure-store) and re-injects it here.
 */
export async function initAuth(): Promise<void> {
  const api = getApiClient();
  if (api instanceof RestApi && !api.getSession()) {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      if (raw) api.restoreSession(JSON.parse(raw) as Session);
    } catch {
      /* missing or corrupt — stay signed out */
    }
  }
}

/** Persist (or clear) the session token in SecureStore after sign-in/out. */
export async function persistSession(session: Session | null): Promise<void> {
  try {
    if (session) {
      await SecureStore.setItemAsync(SESSION_STORE_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
    }
  } catch {
    /* non-fatal: mock mode also persists via MMKV */
  }
}
