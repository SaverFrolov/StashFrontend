import { describe, expect, it } from "vitest";
import { MockApi, typeFromMime } from "@inbox/api-client";
import type { StorageAdapter } from "@inbox/api-client";

function memoryStorage(): StorageAdapter & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/** Pipeline timers are injected and never executed — items stay in "saved". */
const noopSchedule = () => undefined;

describe("MockApi with injected StorageAdapter (mobile)", () => {
  it("persists the session and restores it in a new instance", async () => {
    const storage = memoryStorage();
    const api1 = new MockApi({ storage, schedule: noopSchedule });
    const session = await api1.signIn("demo@inbox.test", "password123");
    expect(session.user.email).toBe("demo@inbox.test");

    const api2 = new MockApi({ storage, schedule: noopSchedule });
    expect(api2.getSession()?.token).toBe(session.token);
  });

  it("persists saved items to the injected storage", async () => {
    const storage = memoryStorage();
    const api = new MockApi({ storage, schedule: noopSchedule });
    const item = await api.saveText({ text: "Заметка для теста" });
    expect(item.title).toBe("Заметка для теста");
    // autoProcess starts the pipeline synchronously; the injected no-op
    // scheduler means it stays in "extracting" (timers never fire)
    expect(item.status).toBe("extracting");

    const api2 = new MockApi({ storage, schedule: noopSchedule });
    const page = await api2.listItems({ limit: 100 });
    expect(page.items.some((i) => i.id === item.id)).toBe(true);
    expect(page.total).toBe(20); // 19 seeded demo items + 1 new
  }, 15_000);

  it("saves RN-style file payloads (uri passthrough, no base64)", async () => {
    const storage = memoryStorage();
    const api = new MockApi({ storage, schedule: noopSchedule });
    const item = await api.saveFile({
      file: {
        uri: "content://downloads/budget.xlsx",
        name: "budget.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 46_000,
      },
    });
    expect(item.type).toBe("xlsx");
    expect(item.original.file?.url).toBe("content://downloads/budget.xlsx");
    expect(item.original.file?.mime).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }, 15_000);
});

describe("typeFromMime for React Native payloads", () => {
  it("resolves types from mime with content/file URIs", () => {
    expect(typeFromMime("audio/mpeg", "content://media/external/audio/media/42")).toBe("audio");
    expect(typeFromMime("video/mp4", "/storage/emulated/0/Download/clip.mp4")).toBe("video");
    expect(
      typeFromMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "budget.xlsx"),
    ).toBe("xlsx");
    expect(typeFromMime("application/pdf", "content://providers/doc.pdf")).toBe("pdf");
  });

  it("falls back to the file name when mime is missing", () => {
    expect(typeFromMime("", "content://downloads/456")).toBe("docx"); // unknown → docx fallback
    expect(typeFromMime("", "song.mp3")).toBe("audio");
    expect(typeFromMime("", "movie.mkv")).toBe("video");
    expect(typeFromMime("", "table.xls")).toBe("xlsx");
  });
});
