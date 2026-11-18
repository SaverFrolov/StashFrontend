import { describe, expect, it } from "vitest";
import type { ItemStatus } from "@inbox/api-client/types";
import {
  ATTENTION_STATUS_LIST,
  STATUS_META,
  needsAttention,
  statusLabelKey,
  statusMeta,
} from "../src/status-meta";

const ALL_STATUSES: ItemStatus[] = [
  "saved",
  "extracting",
  "annotating",
  "done",
  "partial",
  "extraction_failed",
  "ai_failed",
];

describe("status-to-label mapping", () => {
  it("maps every status to a stable i18n label key", () => {
    const expected: Record<ItemStatus, string> = {
      saved: "status.saved",
      extracting: "status.extracting",
      annotating: "status.annotating",
      done: "status.done",
      partial: "status.partial",
      extraction_failed: "status.extractionFailed",
      ai_failed: "status.aiFailed",
    };
    for (const s of ALL_STATUSES) {
      expect(statusLabelKey(s)).toBe(expected[s]);
    }
  });

  it("gives every status an icon and a tone (never colour alone)", () => {
    for (const s of ALL_STATUSES) {
      const meta = statusMeta(s);
      expect(meta.icon).toBeTruthy();
      expect(meta.tone).toBeTruthy();
      expect(meta.labelKey).toBeTruthy();
    }
  });

  it("marks in-progress statuses", () => {
    expect(statusMeta("saved").inProgress).toBe(true);
    expect(statusMeta("extracting").inProgress).toBe(true);
    expect(statusMeta("annotating").inProgress).toBe(true);
    expect(statusMeta("done").inProgress).toBe(false);
    expect(statusMeta("partial").inProgress).toBe(false);
    expect(statusMeta("extraction_failed").inProgress).toBe(false);
    expect(statusMeta("ai_failed").inProgress).toBe(false);
  });

  it("flags exactly the attention statuses", () => {
    for (const s of ALL_STATUSES) {
      expect(needsAttention(s)).toBe(ATTENTION_STATUS_LIST.includes(s));
    }
    expect(needsAttention("partial")).toBe(true);
    expect(needsAttention("extraction_failed")).toBe(true);
    expect(needsAttention("ai_failed")).toBe(true);
    expect(needsAttention("done")).toBe(false);
  });

  it("covers every status in the meta table", () => {
    expect(Object.keys(STATUS_META).sort()).toEqual([...ALL_STATUSES].sort());
  });
});
