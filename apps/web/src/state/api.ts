import { createContext, useContext } from "react";
import type { ApiClient } from "@inbox/api-client";
import { createApiClient } from "@inbox/api-client";

const apiInstance: ApiClient = createApiClient();

export const ApiContext = createContext<ApiClient>(apiInstance);

export function useApi(): ApiClient {
  return useContext(ApiContext);
}

/** Event emitted by MockApi when a pipeline step updates an item. */
export const ITEM_UPDATED_EVENT = "inbox:mock-item-updated";
