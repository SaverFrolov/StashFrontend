import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { darkTokens, glass, lightTokens, radii } from "../src/tokens";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "../../ui/src/tokens.css"), "utf8").toLowerCase();

/**
 * Single-source-of-truth guard: packages/ui/src/tokens.css (web) must stay in
 * sync with the canonical TS tokens consumed by mobile. If a value changes in
 * one place, this test fails until the other is updated.
 */
describe("tokens.css <-> tokens.ts parity", () => {
  it("light theme colors match", () => {
    expect(css).toContain(lightTokens.bg.toLowerCase());
    expect(css).toContain(lightTokens.accent.toLowerCase());
    expect(css).toContain(lightTokens.accentHover.toLowerCase());
    expect(css).toContain(lightTokens.text.toLowerCase());
    expect(css).toContain(lightTokens.textSecondary.toLowerCase());
    expect(css).toContain(lightTokens.textTertiary.toLowerCase());
    expect(css).toContain(lightTokens.success.toLowerCase());
    expect(css).toContain(lightTokens.warning.toLowerCase());
    expect(css).toContain(lightTokens.danger.toLowerCase());
  });

  it("dark theme colors match", () => {
    expect(css).toContain(darkTokens.bg.toLowerCase());
    expect(css).toContain(darkTokens.accent.toLowerCase());
    expect(css).toContain(darkTokens.accentHover.toLowerCase());
    expect(css).toContain(darkTokens.text.toLowerCase());
    expect(css).toContain(darkTokens.success.toLowerCase());
    expect(css).toContain(darkTokens.warning.toLowerCase());
    expect(css).toContain(darkTokens.danger.toLowerCase());
  });

  it("rgb channels match", () => {
    expect(css).toContain(`--accent-rgb: ${lightTokens.accentRgb.join(" ")}`);
    expect(css).toContain(`--success-rgb: ${lightTokens.successRgb.join(" ")}`);
    expect(css).toContain(`--warning-rgb: ${lightTokens.warningRgb.join(" ")}`);
    expect(css).toContain(`--danger-rgb: ${lightTokens.dangerRgb.join(" ")}`);
    expect(css).toContain(`--accent-rgb: ${darkTokens.accentRgb.join(" ")}`);
    expect(css).toContain(`--success-rgb: ${darkTokens.successRgb.join(" ")}`);
    expect(css).toContain(`--warning-rgb: ${darkTokens.warningRgb.join(" ")}`);
    expect(css).toContain(`--danger-rgb: ${darkTokens.dangerRgb.join(" ")}`);
  });

  it("shape and glass values match", () => {
    expect(css).toContain(`--radius-control: ${radii.control}px`);
    expect(css).toContain(`--radius-dialog: ${radii.dialog}px`);
    expect(css).toContain(`--glass-blur: ${glass.blurPx}px`);
    expect(css).toContain(`--glass-saturate: ${Math.round(glass.saturate * 100)}%`);
  });

  it("translucent surfaces match (light)", () => {
    // tokens.css uses modern rgb(a b c / a) notation; compare channel-wise
    expect(css).toContain("--surface: rgb(244 250 246 / 0.66)");
    expect(css).toContain("--surface-subtle: rgb(234 244 237 / 0.45)");
    expect(css).toContain("--border: rgb(14 124 102 / 0.14)");
    expect(css).toContain("--border-strong: rgb(14 124 102 / 0.28)");
    expect(css).toContain("--glass-border: rgb(14 124 102 / 0.18)");
  });

  it("card radius used by web ItemCard matches the card token", () => {
    const itemCard = readFileSync(
      join(here, "../../../apps/web/src/components/ItemCard.tsx"),
      "utf8",
    );
    expect(itemCard).toContain(`rounded-[${radii.card}px]`);
  });
});
