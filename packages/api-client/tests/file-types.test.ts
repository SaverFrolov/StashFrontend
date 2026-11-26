import { describe, expect, it } from "vitest";
import { typeFromMime, isAllowedUploadFile } from "../src/config";

describe("typeFromMime", () => {
  it("detects pdf by mime and extension", () => {
    expect(typeFromMime("application/pdf", "doc.pdf")).toBe("pdf");
    expect(typeFromMime("", "doc.pdf")).toBe("pdf");
  });

  it("detects audio by mime prefix and known extensions", () => {
    expect(typeFromMime("audio/mpeg", "podcast.mp3")).toBe("audio");
    expect(typeFromMime("audio/webm", "voice.webm")).toBe("audio");
    expect(typeFromMime("", "song.mp3")).toBe("audio");
    expect(typeFromMime("", "note.m4a")).toBe("audio");
  });

  it("detects video by mime prefix and known extensions", () => {
    expect(typeFromMime("video/mp4", "lecture.mp4")).toBe("video");
    expect(typeFromMime("video/webm", "clip.webm")).toBe("video");
    expect(typeFromMime("", "movie.mkv")).toBe("video");
  });

  it("detects excel spreadsheets", () => {
    expect(
      typeFromMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "budget.xlsx"),
    ).toBe("xlsx");
    expect(typeFromMime("application/vnd.ms-excel", "old.xls")).toBe("xlsx");
    expect(typeFromMime("", "table.xlsx")).toBe("xlsx");
  });

  it("falls back to docx for word documents and unknown mimes", () => {
    expect(
      typeFromMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "guide.docx"),
    ).toBe("docx");
    expect(typeFromMime("application/octet-stream", "guide.docx")).toBe("docx");
  });
});

describe("isAllowedUploadFile", () => {
  it("accepts documents, spreadsheets, audio and video", () => {
    expect(isAllowedUploadFile({ name: "a.pdf", type: "application/pdf" })).toBe(true);
    expect(isAllowedUploadFile({ name: "a.docx", type: "" })).toBe(true);
    expect(isAllowedUploadFile({ name: "a.xlsx", type: "" })).toBe(true);
    expect(isAllowedUploadFile({ name: "a.mp3", type: "audio/mpeg" })).toBe(true);
    expect(isAllowedUploadFile({ name: "recording.ogg", type: "audio/ogg" })).toBe(true);
    expect(isAllowedUploadFile({ name: "clip.MP4", type: "" })).toBe(true);
    expect(isAllowedUploadFile({ name: "movie", type: "video/x-matroska" })).toBe(true);
  });

  it("accepts raster photos", () => {
    expect(isAllowedUploadFile({ name: "photo.png", type: "image/png" })).toBe(true);
    expect(isAllowedUploadFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAllowedUploadFile({ name: "pic.webp", type: "" })).toBe(true);
    expect(isAllowedUploadFile({ name: "anim.gif", type: "image/gif" })).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAllowedUploadFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
    expect(isAllowedUploadFile({ name: "app.exe", type: "application/x-msdownload" })).toBe(false);
    expect(isAllowedUploadFile({ name: "icon.svg", type: "image/svg+xml" })).toBe(false);
    expect(isAllowedUploadFile({ name: "iphone.heic", type: "image/heic" })).toBe(false);
  });
});

describe("typeFromMime images", () => {
  it("detects raster images by mime and extension", () => {
    expect(typeFromMime("image/png", "photo.png")).toBe("image");
    expect(typeFromMime("image/jpeg", "photo.jpg")).toBe("image");
    expect(typeFromMime("", "photo.JPEG")).toBe("image");
    expect(typeFromMime("", "pic.avif")).toBe("image");
  });

  it("does not treat SVG as an image item", () => {
    expect(typeFromMime("image/svg+xml", "icon.svg")).not.toBe("image");
  });
});
