import type { FeatureFlags, ItemType } from "./types";

export const APP_NAME = "Stash";

export const ALLOWED_FILE_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

/** Extensions accepted by the upload dialog / capture screen (plus any audio/* and video/* mime). */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".xls",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mkv",
];

/** `accept` attribute value shared by all file pickers. */
export const FILE_ACCEPT_ATTR = ".pdf,.docx,.xlsx,.xls,.mp3,.wav,.ogg,.m4a,.flac,.aac,.mp4,.webm,.mov,.m4v,.mkv,audio/*,video/*";

export function isAllowedUploadFile(file: { name: string; type: string }): boolean {
  const n = file.name.toLowerCase();
  if (ALLOWED_UPLOAD_EXTENSIONS.some((ext) => n.endsWith(ext))) return true;
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return true;
  return ALLOWED_FILE_MIME.includes(file.type);
}

/** Resolves the Item type for an uploaded file from mime first, extension second. */
export function typeFromMime(mime: string, name: string): ItemType {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || (!mime && n.endsWith(".pdf"))) return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    (!mime && (n.endsWith(".xlsx") || n.endsWith(".xls")))
  ) {
    return "xlsx";
  }
  if (!mime) {
    if (/\.(mp3|wav|ogg|m4a|flac|aac)$/.test(n)) return "audio";
    if (/\.(mp4|webm|mov|m4v|mkv)$/.test(n)) return "video";
  }
  return "docx";
}

export const FEED_PAGE_SIZE = 20;

export interface AppConfig {
  appName: string;
  apiBaseUrl?: string;
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
  feedPageSize: FEED_PAGE_SIZE,
  features,
};
