// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import i18n, { initI18n } from "../src/i18n";
import { SettingsProvider, useSettings } from "../src/state/settings";

function LanguageProbe() {
  const { language } = useSettings();
  return <span data-testid="lang">{language}</span>;
}

beforeAll(() => {
  localStorage.setItem("inbox-language", "ru");
  initI18n();
});

describe("SettingsProvider language", () => {
  it("tracks i18n language changes so the RU/EN selection highlight follows", async () => {
    render(
      <SettingsProvider>
        <LanguageProbe />
      </SettingsProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("ru");

    await act(async () => {
      await i18n.changeLanguage("en");
    });
    await waitFor(() => expect(screen.getByTestId("lang").textContent).toBe("en"));

    await act(async () => {
      await i18n.changeLanguage("ru");
    });
    await waitFor(() => expect(screen.getByTestId("lang").textContent).toBe("ru"));
  });
});
