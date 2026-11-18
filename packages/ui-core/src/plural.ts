/**
 * Pure plural formatter built on Intl.PluralRules.
 * Russian has one/few/many forms; English has one/other.
 *
 * Hermes note: if Intl.PluralRules is unavailable on the target engine,
 * install @formatjs/intl-pluralrules before i18n init (see migration plan).
 */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other?: string;
  two?: string;
  zero?: string;
}

export function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

/**
 * Returns the interpolated string for `count`, e.g.
 * formatPlural(5, "ru", { one: "{{n}} тег", few: "{{n}} тега", many: "{{n}} тегов" })
 * => "5 тегов"
 */
export function formatPlural(count: number, locale: string, forms: PluralForms): string {
  const category = pluralCategory(count, locale);
  const template = forms[category] ?? forms.other ?? forms.one;
  return template.replace(/\{\{\s*n\s*\}\}/g, new Intl.NumberFormat(locale).format(count));
}

/**
 * Given an i18next-style key map ({ one, few, many, other }) returns the
 * suffix key that should be used for `count` in `locale`.
 */
export function pluralKeySuffix(count: number, locale: string): string {
  return pluralCategory(count, locale);
}
