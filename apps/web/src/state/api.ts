import { createContext, useContext } from "react";
import type { ApiClient } from "@inbox/api-client";
import { createApiClient } from "@inbox/api-client";

const apiInstance: ApiClient = createApiClient();

export const ApiContext = createContext<ApiClient>(apiInstance);

export function useApi(): ApiClient {
  return useContext(ApiContext);
}
