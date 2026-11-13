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

import { App } from "../src/App";
import { initI18n } from "../src/i18n";

beforeAll(() => {
  localStorage.setItem("inbox-language", "ru");
  initI18n();
});

afterEach(() => {
  cleanup();
  localStorage.removeItem("inbox-mock-session-v1");
});

describe("App smoke", () => {
  it("renders the login screen without hitting the error boundary", () => {
    render(<App />);
    expect(screen.queryByText("Something broke")).toBeNull();
    expect(screen.getByLabelText("Эл. почта")).toBeTruthy();
    expect(screen.getByLabelText("Пароль")).toBeTruthy();
  });

  it("signs in and shows the seeded inbox feed", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Эл. почта"), {
      target: { value: "demo@inbox.test" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    // App shell + composer render after the mock sign-in latency
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText(/Вставьте ссылку/)).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Seeded items arrive through the mocked API (300–900 ms latency)
    await waitFor(
      () => {
        expect(screen.getByText("Classic spaghetti carbonara — recipe")).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText("Something broke")).toBeNull();
  });
});
