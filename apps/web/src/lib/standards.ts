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

export type StandardRegister = "MGS" | "UZSTI";

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
};

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
