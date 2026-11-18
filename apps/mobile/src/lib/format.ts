import i18n from "../i18n";

/** Intl-based date/time helpers (web parity). Guarded: if Hermes lacks a
 *  formatter at runtime, fall back to plain locale strings. */

export function currentLocale(): string {
  return i18n.resolvedLanguage === "en" ? "en" : "ru";
}

const hasIntlDateTime = typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function";
const hasIntlRelative = typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function";

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!hasIntlDateTime) return d.toLocaleDateString();
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!hasIntlDateTime) return d.toLocaleString();
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Relative time via Intl.RelativeTimeFormat ("5 min ago" / "5 минут назад"). */
export function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const min = Math.round(diffMs / 60_000);
  if (!hasIntlRelative) {
    const absMin = Math.abs(min);
    if (absMin < 60) return `${absMin} min`;
    return formatDate(iso);
  }
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "auto" });
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hours = Math.round(min / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(months / 12), "year");
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Feed date separators: Today / Yesterday / date. */
export function formatDaySeparator(iso: string, today: string, yesterday: string): string {
  const d = new Date(iso);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dayStart === todayStart) return today;
  if (dayStart === todayStart - 86_400_000) return yesterday;
  if (!hasIntlDateTime) return d.toLocaleDateString();
  return new Intl.DateTimeFormat(currentLocale(), { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units: Array<[number, string]> = [
    [1024, "KB"],
    [1024 ** 2, "MB"],
    [1024 ** 3, "GB"],
  ];
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, suffix] = units[i];
    if (bytes >= size) {
      return `${(bytes / size).toFixed(bytes / size < 10 ? 1 : 0)} ${suffix}`;
    }
  }
  return `${bytes} B`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function domainOf(url: string | undefined): string {
  if (!url) return "";
  try {
    // URL may be missing on some RN runtimes; regex fallback keeps it safe.
    const Ctor = (globalThis as { URL?: typeof URL }).URL;
    if (Ctor) return new Ctor(url).hostname.replace(/^www\./, "");
  } catch {
    /* fall through */
  }
  const m = url.match(/^https?:\/\/([^/]+)/);
  return m ? m[1].replace(/^www\./, "") : url;
}
