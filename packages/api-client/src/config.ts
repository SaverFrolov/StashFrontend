import type { FeatureFlags } from "./types";

export const APP_NAME = "Stash";

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_FILE_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const FEED_PAGE_SIZE = 20;

export interface AppConfig {
  appName: string;
  apiBaseUrl?: string;
  maxFileSizeBytes: number;
  feedPageSize: number;
  features: FeatureFlags;
}

const env = typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;

export const features: FeatureFlags = {
  audio: true,
  semanticSearch: true,
  export: true,
};

export const config: AppConfig = {
  appName: APP_NAME,
  apiBaseUrl: env?.VITE_API_BASE_URL || undefined,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  feedPageSize: FEED_PAGE_SIZE,
  features,
};
