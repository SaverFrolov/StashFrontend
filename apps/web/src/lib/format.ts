import i18n from "../i18n";

/** Intl-based date/time helpers. UI language drives the locale. */
export function currentLocale(): string {
  return i18n.resolvedLanguage === "en" ? "en" : "ru";
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(currentLocale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Relative time via Intl.RelativeTimeFormat ("5 min ago" / "5 минут назад"). */
export function formatRelative(iso: string): string {
  const locale = currentLocale();
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const min = Math.round(diffMs / 60_000);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hours = Math.round(min / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(months / 12), "year");
}

/** Feed date separators: Today / Yesterday / date. */
export function formatDaySeparator(iso: string, today: string, yesterday: string): string {
  const locale = currentLocale();
  const d = new Date(iso);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dayStart === todayStart) return today;
  if (dayStart === todayStart - 86_400_000) return yesterday;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatBytes(bytes: number): string {
  const locale = currentLocale();
  if (bytes < 1024) return new Intl.NumberFormat(locale).format(bytes) + " B";
  const units: Array<[number, string]> = [
    [1024, "KB"],
    [1024 ** 2, "MB"],
    [1024 ** 3, "GB"],
  ];
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, suffix] = units[i];
    if (bytes >= size) {
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / size)} ${suffix}`;
    }
  }
  return `${bytes} B`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function domainOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Plural-aware count formatting that pulls forms from i18n keys. */
export function pluralCount(key: string, count: number): string {
  return i18n.t(key, { count });
}
