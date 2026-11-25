import { afterEach, describe, expect, it, vi } from "vitest";
import { RestApi } from "../src/client";
import type { Session, SessionStorage } from "../src/types";

function fakeStorage(): SessionStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const session: Session = {
  token: "tok-123",
  user: { id: "u1", name: "Test", email: "t@t.local" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RestApi session persistence", () => {
  it("persists on signIn and restores in a new instance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => session,
      })),
    );
    const storage = fakeStorage();
    const api = new RestApi("", null, storage);
    await api.signIn("t@t.local", "pass");
    expect(storage.map.get("stash-session")).toContain("tok-123");

    const reloaded = new RestApi("", null, storage);
    expect(reloaded.getSession()?.token).toBe("tok-123");
  });

  it("clears storage on signOut", async () => {
    const storage = fakeStorage();
    const api = new RestApi("", session, storage);
    await api.signOut();
    expect(storage.map.has("stash-session")).toBe(false);
    expect(api.getSession()).toBeNull();
  });

  it("survives corrupt stored JSON", () => {
    const storage = fakeStorage();
    storage.setItem("stash-session", "{broken");
    const api = new RestApi("", null, storage);
    expect(api.getSession()).toBeNull();
    expect(storage.map.has("stash-session")).toBe(false);
  });

  it("restoreSession persists (mobile bootstrap path)", () => {
    const storage = fakeStorage();
    const api = new RestApi("", null, storage);
    api.restoreSession(session);
    expect(storage.map.get("stash-session")).toContain("tok-123");
  });
});
