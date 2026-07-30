import type { Lang } from "@/lib/i18n";

/**
 * Dates and numbers, in the reader's language.
 *
 * Uzbek is written out by hand here rather than handed to Intl.
 *
 * Browsers commonly ship no Latin-script Uzbek locale data — only uz-Cyrl — so
 * `"uz-UZ"` silently falls back to the root locale and renders "2026 M07 30
 * 11:31" and "-2 h" instead of a readable date and phrase. Node does carry the
 * data, so leaving it to Intl also makes server-rendered markup disagree with
 * what the browser produces when it hydrates the same value. Both problems go
 * away once the wording is ours.
 *
 * Everything is pinned to Tashkent. The registers, their publishers and almost
 * every reader are there, Uzbekistan keeps UTC+5 all year, and a fixed zone is
 * what makes the server's string and the browser's identical — without it a
 * reader abroad can be shown a date one day off from the register's own.
 *
 * A plain module, deliberately: a value exported from a `"use client"` file
 * arrives at a Server Component as a client-reference stub rather than the
 * value, so shared helpers have to live outside one.
 */

const LOCALES: Record<Lang, string> = { ru: "ru-RU", uz: "uz-UZ", en: "en-GB" };

const TASHKENT = "Asia/Tashkent";

const UZ_MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

const UZ_MONTHS_LONG = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const JUST_NOW: Record<Lang, string> = {
  ru: "только что",
  uz: "hozirgina",
  en: "just now",
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Date and time in Tashkent, as digits. Read through en-GB, whose data every
 * runtime has, because only the numbers are taken from it.
 */
function tashkentParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TASHKENT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: value("year"),
    month: Number(value("month")),
    day: Number(value("day")),
    /** Zero-padded, as a date is written. */
    dayPadded: value("day"),
    monthPadded: value("month"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

/**
 * A whole number with thousands grouped: a space in Uzbek, whatever the locale
 * says elsewhere.
 */
export function formatNumber(value: number, lang: Lang): string {
  if (lang === "uz") return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return value.toLocaleString(LOCALES[lang]);
}

/**
 * A number with a fixed number of decimals. Russian and Uzbek both separate
 * decimals with a comma; only English uses a point.
 */
export function formatDecimal(value: number, lang: Lang, digits = 1): string {
  const text = value.toFixed(digits);
  return lang === "en" ? text : text.replace(".", ",");
}

/** Digits only — "30.07.2026". For dense tables of dates. */
export function formatDateNumeric(value: string | Date | null | undefined, lang: Lang): string | null {
  const date = toDate(value);
  if (!date) return null;

  const p = tashkentParts(date);
  if (lang === "uz") return `${p.dayPadded}.${p.monthPadded}.${p.year}`;

  return date.toLocaleDateString(LOCALES[lang], { timeZone: TASHKENT });
}

/** Month spelled out — "30-iyul 2026". For prose and datelines. */
export function formatDateLong(value: string | Date | null | undefined, lang: Lang): string | null {
  const date = toDate(value);
  if (!date) return null;

  if (lang === "uz") {
    const p = tashkentParts(date);
    return `${p.day}-${UZ_MONTHS_LONG[p.month - 1]} ${p.year}`;
  }

  return date.toLocaleDateString(LOCALES[lang], {
    timeZone: TASHKENT,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Date and time, with the offset spelled out so a reader outside Uzbekistan is
 * not misled — "30-iyl 2026, 14:00 (UTC+5)".
 */
export function formatDateTime(value: string | Date | null | undefined, lang: Lang): string | null {
  const date = toDate(value);
  if (!date) return null;

  if (lang === "uz") {
    const p = tashkentParts(date);
    return `${p.day}-${UZ_MONTHS_SHORT[p.month - 1]} ${p.year}, ${p.hour}:${p.minute} (UTC+5)`;
  }

  const text = date.toLocaleString(LOCALES[lang], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TASHKENT,
  });
  return `${text} (UTC+5)`;
}

/**
 * "2 hours ago" — useless on paper, but the fastest read on screen.
 *
 * `now` is passed in rather than read here: a relative phrase depends on the
 * instant it is rendered, and the caller is the one that knows whether it holds
 * the server's clock or the browser's.
 *
 * Uzbek numerals take no plural agreement, so the templates need no
 * special-casing.
 */
export function formatRelative(
  value: string | Date | null | undefined,
  now: number,
  lang: Lang,
): string | null {
  const date = toDate(value);
  if (!date) return null;

  const hours = (now - date.getTime()) / 3_600_000;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return JUST_NOW[lang];

  if (lang === "uz") {
    if (minutes < 60) return `${minutes} daqiqa oldin`;
    if (hours < 48) return `${Math.floor(hours)} soat oldin`;
    return `${Math.floor(hours / 24)} kun oldin`;
  }

  const rtf = new Intl.RelativeTimeFormat(LOCALES[lang], { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 48) return rtf.format(-Math.floor(hours), "hour");
  return rtf.format(-Math.floor(hours / 24), "day");
}

/**
 * A price with its currency. Uzbek gets the grouped number followed by the
 * currency code — the same shape ru-RU produces — because the root-locale
 * fallback would otherwise put the code in front and group with commas.
 */
export function formatCurrency(amount: number, currency: string, lang: Lang): string {
  if (lang === "uz") return `${formatNumber(Math.round(amount), "uz")} ${currency}`;

  try {
    return new Intl.NumberFormat(LOCALES[lang], {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unrecognised currency code: show the number and the code as given.
    return `${formatNumber(Math.round(amount), lang)} ${currency}`;
  }
}
