export * from "./types";
export * from "./schemas";
export { config, features, APP_NAME, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, ALLOWED_FILE_MIME, ALLOWED_UPLOAD_EXTENSIONS, FILE_ACCEPT_ATTR, FEED_PAGE_SIZE, isAllowedUploadFile, typeFromMime } from "./config";
export type { AppConfig } from "./config";
export { RestApi, ATTENTION_STATUSES } from "./client";
export type { ApiClient } from "./client";
export { MockApi, isUrl, splitUrlAndComment } from "./mock";
export { seedItems, seedCollections, seedTags } from "./seed";

import { config } from "./config";
import { RestApi } from "./client";
import { MockApi } from "./mock";
import type { ApiClient } from "./client";

/** Selects the REST implementation when VITE_API_BASE_URL is set, MockApi otherwise. */
export function createApiClient(): ApiClient {
  if (config.apiBaseUrl) return new RestApi(config.apiBaseUrl);
  return new MockApi();
}
