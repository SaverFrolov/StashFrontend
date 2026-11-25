import * as FileSystem from "expo-file-system/legacy";

/** The REST API accepts uploads as data URLs; convert local file:// URIs. */
export async function toDataUrl(uri: string, mimeType: string): Promise<string> {
  if (uri.startsWith("data:")) return uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType || "application/octet-stream"};base64,${base64}`;
}
