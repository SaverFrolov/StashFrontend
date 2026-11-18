/**
 * Pure helpers for incoming Android/iOS share payloads (expo-sharing
 * getSharedPayloads). Kept dependency-free so they can be unit-tested on Node.
 * The SharePayload shape is mirrored structurally from expo-sharing.
 */

export interface SharedPayload {
  /** text body / URL string / file URI depending on shareType */
  value: string;
  shareType: "text" | "url" | "audio" | "image" | "video" | "file";
  mimeType?: string;
}

export interface SharedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface ShareParseResult {
  text?: string;
  files: SharedFile[];
}

/** Best-effort file name from a content:// or file:// URI. */
export function fileNameFromUri(uri: string): string {
  const clean = uri.split("?")[0].split("#")[0];
  const last = clean.split("/").pop() ?? "";
  if (!last) return "file";
  try {
    return decodeURIComponent(last) || "file";
  } catch {
    return last;
  }
}

/**
 * Splits incoming payloads into a text part (text + url joined by newline,
 * for the capture text field) and file parts (audio/image/video/file).
 */
export function parseSharePayloads(payloads: SharedPayload[]): ShareParseResult {
  const texts: string[] = [];
  const files: SharedFile[] = [];
  for (const p of payloads) {
    if (!p || typeof p.value !== "string" || !p.value) continue;
    if (p.shareType === "text" || p.shareType === "url") {
      texts.push(p.value);
    } else {
      files.push({
        uri: p.value,
        name: fileNameFromUri(p.value),
        mimeType: p.mimeType ?? "",
      });
    }
  }
  return { text: texts.length ? texts.join("\n") : undefined, files };
}
