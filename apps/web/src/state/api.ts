import { createContext, useContext } from "react";
import type { ApiClient } from "@inbox/api-client";
import { createApiClient } from "@inbox/api-client";

// Persist the session across page reloads; the backend token lives 30 days.
const apiInstance: ApiClient = createApiClient({
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
});

export const ApiContext = createContext<ApiClient>(apiInstance);

export function useApi(): ApiClient {
  return useContext(ApiContext);
}
