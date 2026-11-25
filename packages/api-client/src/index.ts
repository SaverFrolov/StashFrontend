export * from "./types";
export * from "./schemas";
export { config, features, APP_NAME, ALLOWED_FILE_MIME, ALLOWED_UPLOAD_EXTENSIONS, FILE_ACCEPT_ATTR, FEED_PAGE_SIZE, isAllowedUploadFile, typeFromMime, isUrl, splitUrlAndComment } from "./config";
export type { AppConfig } from "./config";
export { RestApi, ATTENTION_STATUSES } from "./client";
export type { ApiClient } from "./client";

import { config } from "./config";
import { RestApi } from "./client";
import type { ApiClient } from "./client";
import type { SessionStorage } from "./types";

/** Always REST. Empty base URL = same origin (API serves the built frontend). */
export function createApiClient(storage?: SessionStorage): ApiClient {
  return new RestApi(config.apiBaseUrl ?? "", null, storage);
}
