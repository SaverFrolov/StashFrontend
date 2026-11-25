import * as SecureStore from "expo-secure-store";
import { RestApi, config } from "@inbox/api-client";
import type { ApiClient, Session } from "@inbox/api-client";

let client: ApiClient | null = null;

/** Always REST. EXPO_PUBLIC_API_BASE_URL overrides the default same-origin URL. */
export function getApiClient(): ApiClient {
  if (!client) {
    client = new RestApi(config.apiBaseUrl ?? "");
  }
  return client;
}

const SESSION_STORE_KEY = "auth-session";

/**
 * Restore the persisted session at startup. RestApi keeps the session in
 * memory only, so mobile persists it in SecureStore and re-injects it here.
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
    /* non-fatal */
  }
}
