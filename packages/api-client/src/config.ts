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
  // SVG excluded: inline SVG can carry scripts in the site origin.
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
];

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/avif"];

/** `accept` attribute value shared by all file pickers. */
export const FILE_ACCEPT_ATTR =
  ".pdf,.docx,.xlsx,.xls,.mp3,.wav,.ogg,.m4a,.flac,.aac,.mp4,.webm,.mov,.m4v,.mkv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.avif,audio/*,video/*," +
  ALLOWED_IMAGE_MIME.join(",");

export function isAllowedUploadFile(file: { name: string; type: string }): boolean {
  const n = file.name.toLowerCase();
  if (ALLOWED_UPLOAD_EXTENSIONS.some((ext) => n.endsWith(ext))) return true;
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return true;
  if (ALLOWED_IMAGE_MIME.includes(file.type)) return true;
  return ALLOWED_FILE_MIME.includes(file.type);
}

/** Resolves the Item type for an uploaded file from mime first, extension second. */
export function typeFromMime(mime: string, name: string): ItemType {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || (!mime && n.endsWith(".pdf"))) return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (ALLOWED_IMAGE_MIME.includes(mime)) return "image";
  if (!mime && /\.(jpe?g|png|gif|webp|bmp|avif)$/.test(n)) return "image";
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

export function isUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitUrlAndComment(text: string): { url: string; rest: string } | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  if (!match) return null;
  const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
  if (urls.length !== 1) return null;
  return { url: match[0], rest: text.replace(match[0], "").trim() };
}

export const FEED_PAGE_SIZE = 20;

export interface AppConfig {
  appName: string;
  apiBaseUrl?: string;
  feedPageSize: number;
  features: FeatureFlags;
}

const env = typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
// Expo/Metro exposes EXPO_PUBLIC_* via process.env; browsers don't define process.
const expoEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

export const features: FeatureFlags = {
  audio: true,
  semanticSearch: true,
  export: true,
};

export const config: AppConfig = {
  appName: APP_NAME,
  apiBaseUrl: env?.VITE_API_BASE_URL || expoEnv?.EXPO_PUBLIC_API_BASE_URL || undefined,
  feedPageSize: FEED_PAGE_SIZE,
  features,
};
