// The standards catalogue: the documents laboratories are accredited against.
//
// Two sources, kept distinct because they are genuinely different corpora —
// UZSTI publishes Uzbekistan's own standards (and the international ones it
// adopts), MGS publishes the interstate GOST series. A document can exist in
// both under different designations; those are separate publications, not
// duplicates, and the register a row came from is always shown.
//
// A plain module, not a "use client" one: the catalogue page fetches on the
// server and the filters run in the browser, and both need these.

export const STANDARDS_PATH = "/standards";

export type StandardRegister = "MGS" | "UZSTI" | "ISO" | "CEN";

export type StandardStatus =
  | "IN_FORCE"
  | "SUPERSEDED"
  | "WITHDRAWN"
  | "NOT_YET_IN_FORCE"
  | "UNKNOWN";

/** A row in the result list — the API omits the abstract and search key here. */
export interface StandardListItem {
  id: string;
  slug: string;
  register: StandardRegister;
  sourceId: string;
  sourceUrl: string;
  /** "ГОСТ EN 581-1-2022" — what an accreditation scope cites. */
  designation: string;
  title: string;
  status: StandardStatus;
  /** The catalogue's own wording, kept verbatim beside the mapped status. */
  statusLabel: string | null;
  icsCode: string | null;
  icsLabel: string | null;
  category: string | null;
  language: string | null;
  year: number | null;
  pageCount: number | null;
  priceUzs: number | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  developer: string | null;
  technicalCommittee: string | null;
  adoptingStates: string[];
  detailFetchedAt: string | null;
  lastSeenAt: string | null;
  disappearedAt: string | null;
}

export interface Standard extends StandardListItem {
  abstract: string | null;
}

export interface StandardsPage {
  items: StandardListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StandardsFacets {
  registers: { value: StandardRegister; count: number }[];
  statuses: { value: StandardStatus; count: number }[];
  ics: { code: string | null; label: string | null; count: number }[];
  languages: { value: string | null; count: number }[];
  yearRange: { min: number | null; max: number | null };
}

export interface StandardsQuery {
  q?: string;
  register?: StandardRegister | "";
  status?: StandardStatus | "";
  ics?: string;
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  sort?: "newest" | "oldest" | "designation";
}

export const EMPTY_QUERY: StandardsQuery = {
  q: "",
  register: "",
  status: "",
  ics: "",
  language: "",
  page: 1,
  sort: "newest",
};

/** Only the parts that are set — an empty filter must not narrow anything. */
export function toSearchParams(query: StandardsQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.register) params.set("register", query.register);
  if (query.status) params.set("status", query.status);
  if (query.ics) params.set("ics", query.ics);
  if (query.language) params.set("language", query.language);
  if (query.yearFrom) params.set("yearFrom", String(query.yearFrom));
  if (query.yearTo) params.set("yearTo", String(query.yearTo));
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function isFiltered(query: StandardsQuery): boolean {
  return Boolean(
    query.q?.trim() ||
      query.register ||
      query.status ||
      query.ics ||
      query.language ||
      query.yearFrom ||
      query.yearTo,
  );
}

export const REGISTER_LABELS: Record<StandardRegister, { ru: string; uz: string; en: string }> = {
  UZSTI: {
    ru: "Стандарты Узбекистана (UZSTI)",
    uz: "O'zbekiston standartlari (UZSTI)",
    en: "Uzbek standards (UZSTI)",
  },
  MGS: {
    ru: "Межгосударственные стандарты (ГОСТ)",
    uz: "Davlatlararo standartlar (GOST)",
    en: "Interstate standards (GOST)",
  },
  ISO: {
    ru: "Международные стандарты (ISO)",
    uz: "Xalqaro standartlar (ISO)",
    en: "International standards (ISO)",
  },
  CEN: {
    ru: "Европейские стандарты (CEN/CENELEC)",
    uz: "Yevropa standartlari (CEN/CENELEC)",
    en: "European standards (CEN/CENELEC)",
  },
};

/**
 * Required by the licence, not offered as a courtesy. The ISO datasets are
 * published under ODC-By v1.0, whose one condition is attribution, and ISO
 * specifies the wording. It stays on the page for as long as the records do.
 */
export const ISO_ATTRIBUTION = {
  datasets: [
    { id: "iso_deliverables_metadata", label: "ISO Deliverables Metadata" },
    { id: "iso_ics", label: "International Classification for Standards (ICS)" },
  ],
  openDataUrl: "https://www.iso.org/open-data.html",
  licenceUrl: "https://opendatacommons.org/licenses/by/1-0/",
  licenceName: "ODC Attribution License (ODC-By) v1.0",
} as const;

export const STATUS_LABELS: Record<StandardStatus, { ru: string; uz: string; en: string }> = {
  IN_FORCE: { ru: "Действует", uz: "Amalda", en: "In force" },
  SUPERSEDED: { ru: "Заменён", uz: "Almashtirilgan", en: "Superseded" },
  WITHDRAWN: { ru: "Отменён", uz: "Bekor qilingan", en: "Withdrawn" },
  NOT_YET_IN_FORCE: {
    ru: "Ещё не введён",
    uz: "Hali kuchga kirmagan",
    en: "Not yet in force",
  },
  UNKNOWN: { ru: "Не указано", uz: "Ko'rsatilmagan", en: "Not stated" },
};

/** Green for a document you may rely on, amber for one you may not. */
export function statusTone(status: StandardStatus): { bg: string; fg: string } {
  switch (status) {
    case "IN_FORCE":
      return { bg: "var(--uz-success-bg)", fg: "var(--uz-success)" };
    case "SUPERSEDED":
    case "WITHDRAWN":
      return { bg: "var(--uz-warning-bg)", fg: "var(--uz-warning)" };
    default:
      return { bg: "var(--uz-bg-sunken)", fg: "var(--uz-text-muted)" };
  }
}

// --- The language a document is actually written in --------------------------
//
// A standard's title and scope are the source's own text, and each catalogue
// publishes a given document in exactly one language: 5 721 of the UZSTI scopes
// are Uzbek, 2 631 Russian, 469 English, and the whole GOST corpus is Russian.
// There is no second version to switch to, so this text cannot follow the site's
// language toggle the way our own wording does.
//
// What we can do is say which language it is in, so a reader who switched to
// English and met Uzbek text knows they are looking at the document itself
// rather than at a broken toggle.

/** The catalogues' own spellings, normalised past the several apostrophes. */
function normaliseLanguage(value: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/['‘’`ʻʼ]/g, "")
    .trim();
}

/** Maps a source language onto one of ours, when it is one of ours. */
export function sourceLanguageCode(value: string | null): "ru" | "uz" | "en" | null {
  const text = normaliseLanguage(value);
  if (!text) return null;
  if (text.startsWith("ozbek") || text.startsWith("uzbek") || text === "uz") return "uz";
  if (text.startsWith("рус") || text.startsWith("rus") || text === "ru") return "ru";
  if (text.startsWith("english") || text.startsWith("ingliz") || text === "en") return "en";
  return null;
}

/** French appears on three UZSTI records and nowhere else. */
export function sourceLanguageKey(value: string | null): string | null {
  const code = sourceLanguageCode(value);
  if (code) return code;
  return normaliseLanguage(value).startsWith("fren") ? "fr" : null;
}

/** "in Uzbek" / "на узбекском" — how to name the language of the text shown. */
export const SOURCE_LANGUAGE_NAMES: Record<string, { ru: string; uz: string; en: string }> = {
  uz: { ru: "на узбекском", uz: "o'zbek tilida", en: "in Uzbek" },
  ru: { ru: "на русском", uz: "rus tilida", en: "in Russian" },
  en: { ru: "на английском", uz: "ingliz tilida", en: "in English" },
  fr: { ru: "на французском", uz: "fransuz tilida", en: "in French" },
};
