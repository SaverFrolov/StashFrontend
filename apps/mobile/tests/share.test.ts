import { describe, expect, it } from "vitest";
import { fileNameFromUri, parseSharePayloads } from "../src/lib/share";
import type { SharedPayload } from "../src/lib/share";

describe("fileNameFromUri", () => {
  it("extracts and decodes the last path segment", () => {
    expect(fileNameFromUri("file:///data/user/0/app/cache/report%20final.pdf")).toBe("report final.pdf");
    expect(fileNameFromUri("content://media/external/audio/media/42")).toBe("42");
    expect(fileNameFromUri("https://example.com/files/doc.docx?v=2")).toBe("doc.docx");
  });

  it("falls back gracefully", () => {
    expect(fileNameFromUri("")).toBe("file");
    expect(fileNameFromUri("malformed%/")).toBe("file");
  });
});

describe("parseSharePayloads", () => {
  it("joins text and url payloads into one text", () => {
    const payloads: SharedPayload[] = [
      { value: "https://example.com/recipe", shareType: "url" },
      { value: "Попробовать на выходных", shareType: "text" },
    ];
    const result = parseSharePayloads(payloads);
    expect(result.text).toBe("https://example.com/recipe\nПопробовать на выходных");
    expect(result.files).toEqual([]);
  });

  it("collects file payloads with names and mime types", () => {
    const payloads: SharedPayload[] = [
      { value: "content://downloads/budget.xlsx", shareType: "file", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { value: "content://media/video/clip.mp4", shareType: "video", mimeType: "video/mp4" },
      { value: "content://media/audio/song.mp3", shareType: "audio", mimeType: "audio/mpeg" },
    ];
    const result = parseSharePayloads(payloads);
    expect(result.text).toBeUndefined();
    expect(result.files).toHaveLength(3);
    expect(result.files[0]).toEqual({
      uri: "content://downloads/budget.xlsx",
      name: "budget.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(result.files[2].name).toBe("song.mp3");
  });

  it("mixes text and files, skipping empty payloads", () => {
    const payloads: SharedPayload[] = [
      { value: "", shareType: "text" },
      { value: "заметка", shareType: "text" },
      { value: "file:///sdcard/Download/lecture.pdf", shareType: "file", mimeType: "application/pdf" },
    ];
    const result = parseSharePayloads(payloads);
    expect(result.text).toBe("заметка");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe("lecture.pdf");
  });

  it("handles an empty payload list", () => {
    const result = parseSharePayloads([]);
    expect(result.text).toBeUndefined();
    expect(result.files).toEqual([]);
  });
});
