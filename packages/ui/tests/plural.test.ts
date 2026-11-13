import { describe, expect, it } from "vitest";
import { formatPlural, pluralCategory } from "../src/lib/plural";

describe("pluralCategory", () => {
  it("handles Russian one/few/many forms", () => {
    expect(pluralCategory(1, "ru")).toBe("one");
    expect(pluralCategory(2, "ru")).toBe("few");
    expect(pluralCategory(4, "ru")).toBe("few");
    expect(pluralCategory(5, "ru")).toBe("many");
    expect(pluralCategory(11, "ru")).toBe("many");
    expect(pluralCategory(12, "ru")).toBe("many");
    expect(pluralCategory(21, "ru")).toBe("one");
    expect(pluralCategory(22, "ru")).toBe("few");
    expect(pluralCategory(25, "ru")).toBe("many");
    expect(pluralCategory(0, "ru")).toBe("many");
  });

  it("handles English one/other forms", () => {
    expect(pluralCategory(0, "en")).toBe("other");
    expect(pluralCategory(1, "en")).toBe("one");
    expect(pluralCategory(2, "en")).toBe("other");
    expect(pluralCategory(21, "en")).toBe("other");
  });
});

describe("formatPlural", () => {
  const ruForms = { one: "{{n}} тег", few: "{{n}} тега", many: "{{n}} тегов" };

  it("formats Russian counts with the right form", () => {
    expect(formatPlural(1, "ru", ruForms)).toBe("1 тег");
    expect(formatPlural(3, "ru", ruForms)).toBe("3 тега");
    expect(formatPlural(5, "ru", ruForms)).toBe("5 тегов");
    expect(formatPlural(21, "ru", ruForms)).toBe("21 тег");
    expect(formatPlural(112, "ru", ruForms)).toBe("112 тегов");
  });

  it("formats English counts", () => {
    const enForms = { one: "{{n}} item", other: "{{n}} items" };
    expect(formatPlural(1, "en", enForms)).toBe("1 item");
    expect(formatPlural(2, "en", enForms)).toBe("2 items");
    expect(formatPlural(0, "en", enForms)).toBe("0 items");
  });

  it("falls back to `one` when the category form is missing", () => {
    expect(formatPlural(5, "ru", { one: "{{n}} x" })).toBe("5 x");
  });
});
