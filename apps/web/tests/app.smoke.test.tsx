// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

vi.mock("virtual:pwa-register", () => ({ registerSW: () => () => undefined }));

// jsdom has no matchMedia implementation
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// Stub the real REST API: session on signin, empty collections elsewhere.
const session = { token: "test-token", user: { id: "u1", name: "Demo", email: "demo@inbox.test" } };
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    const body = path.includes("/auth/signin")
      ? session
      : path.includes("/attention-count")
        ? { count: 0 }
        : path.includes("/items")
          ? { items: [], hasMore: false, total: 0 }
          : path.includes("/settings/ai")
            ? { provider: "openai", baseUrl: "https://ru.airouter.host/v1", model: "m", apiKeySet: false, autoProcess: true }
            : path.includes("/usage")
              ? { bytesUsed: 0 }
              : [];
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Headers(),
    };
  }),
);

import { App } from "../src/App";
import { initI18n } from "../src/i18n";

beforeAll(() => {
  localStorage.setItem("inbox-language", "ru");
  initI18n();
});

afterEach(() => {
  cleanup();
});

describe("App smoke", () => {
  it("renders the login screen without hitting the error boundary", () => {
    render(<App />);
    expect(screen.queryByText("Something broke")).toBeNull();
    expect(screen.getByLabelText("Эл. почта")).toBeTruthy();
    expect(screen.getByLabelText("Пароль")).toBeTruthy();
  });

  it("signs in against the REST API and shows the inbox shell", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Эл. почта"), {
      target: { value: "demo@inbox.test" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(
      () => {
        expect(screen.getByPlaceholderText(/Вставьте ссылку/)).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signin"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByText("Something broke")).toBeNull();
  });
});
