import { MockApi, RestApi, config } from "@inbox/api-client";
import type { ApiClient } from "@inbox/api-client";
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
