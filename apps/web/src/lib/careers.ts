import type { Lang } from "@/lib/i18n";

/**
 * The careers API, as the browser sees it.
 *
 * Vacancy text is stored in whatever language the employer wrote it in — one
 * posting, one wording. The interface around it translates; the posting itself
 * is the employer's own words and is shown as written, the same way a
 * laboratory's registered name is.
 */

export const CAREERS_PATH = "/careers";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type VacancyStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type ApplicationStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "REJECTED"
  | "WITHDRAWN";

export interface Vacancy {
  id: string;
  slug: string;
  title: string;
  organisationName: string;
  region: string | null;
  city: string | null;
  employmentType: EmploymentType;
  salary: string | null;
  description: string;
  requirements: string | null;
  contactEmail: string;
  contactPhone: string | null;
  urgent: boolean;
  status: VacancyStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  laboratory: { slug: string; name: string } | null;
}

export interface MyVacancy extends Vacancy {
  createdAt: string;
  _count: { applications: number };
}

export interface VacancyPage {
  items: Vacancy[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VacancyFacets {
  regions: { value: string; count: number }[];
  employmentTypes: { value: EmploymentType; count: number }[];
}

export interface JobApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  cvUrl: string | null;
  status: ApplicationStatus;
  employerNote: string | null;
  createdAt: string;
}

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  vacancy: { slug: string; title: string; organisationName: string };
}

type L10n = Record<Lang, string>;

export const EMPLOYMENT_LABELS: Record<EmploymentType, L10n> = {
  FULL_TIME: { ru: "Полная занятость", uz: "To'liq bandlik", en: "Full-time" },
  PART_TIME: { ru: "Частичная занятость", uz: "Qisman bandlik", en: "Part-time" },
  CONTRACT: { ru: "Договор подряда", uz: "Shartnoma asosida", en: "Contract" },
  INTERNSHIP: { ru: "Стажировка", uz: "Amaliyot", en: "Internship" },
};

export const APPLICATION_LABELS: Record<ApplicationStatus, L10n> = {
  SUBMITTED: { ru: "Отправлено", uz: "Yuborilgan", en: "Submitted" },
  REVIEWING: { ru: "На рассмотрении", uz: "Ko'rib chiqilmoqda", en: "Under review" },
  SHORTLISTED: { ru: "В коротком списке", uz: "Qisqa ro'yxatda", en: "Shortlisted" },
  REJECTED: { ru: "Отклонено", uz: "Rad etilgan", en: "Rejected" },
  WITHDRAWN: { ru: "Отозвано", uz: "Qaytarib olingan", en: "Withdrawn" },
};

export const VACANCY_STATUS_LABELS: Record<VacancyStatus, L10n> = {
  DRAFT: { ru: "Черновик", uz: "Qoralama", en: "Draft" },
  PUBLISHED: { ru: "Опубликована", uz: "E'lon qilingan", en: "Published" },
  CLOSED: { ru: "Закрыта", uz: "Yopilgan", en: "Closed" },
};

/** Green for a live posting, muted for a finished one. */
export function applicationTone(status: ApplicationStatus): { bg: string; fg: string } {
  switch (status) {
    case "SHORTLISTED":
      return { bg: "var(--uz-success-bg)", fg: "var(--uz-success-fg)" };
    case "REJECTED":
    case "WITHDRAWN":
      return { bg: "var(--uz-bg-raised)", fg: "var(--uz-text-faint)" };
    default:
      return { bg: "var(--uz-blue-50)", fg: "var(--uz-blue-600)" };
  }
}

/** A closed or expired posting can be read but not applied to. */
export function isOpen(vacancy: Vacancy): boolean {
  if (vacancy.status !== "PUBLISHED") return false;
  if (!vacancy.expiresAt) return true;
  return new Date(vacancy.expiresAt).getTime() > Date.now();
}

export interface VacancyQuery {
  q?: string;
  region?: string;
  employmentType?: EmploymentType | "";
  page?: number;
}

export function toSearchParams(query: VacancyQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.region) params.set("region", query.region);
  if (query.employmentType) params.set("employmentType", query.employmentType);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// --- Candidates ------------------------------------------------------------

export type CandidateVisibility = "HIDDEN" | "PUBLISHED";

/** The registry's own field vocabulary, so both sides mean the same thing. */
export type LaboratoryField =
  | "TESTING"
  | "METROLOGY"
  | "MEDICINE"
  | "ECOLOGY"
  | "INDUSTRY"
  | "AGRICULTURE"
  | "FOOD"
  | "CONSTRUCTION"
  | "OTHER";

export const FIELD_LABELS: Record<LaboratoryField, L10n> = {
  TESTING: { ru: "Испытания", uz: "Sinov", en: "Testing" },
  METROLOGY: { ru: "Метрология", uz: "Metrologiya", en: "Metrology" },
  MEDICINE: { ru: "Медицина", uz: "Tibbiyot", en: "Medicine" },
  ECOLOGY: { ru: "Экология", uz: "Ekologiya", en: "Ecology" },
  INDUSTRY: { ru: "Промышленность", uz: "Sanoat", en: "Industry" },
  AGRICULTURE: {
    ru: "Сельское хозяйство",
    uz: "Qishloq xo'jaligi",
    en: "Agriculture",
  },
  FOOD: { ru: "Пищевая продукция", uz: "Oziq-ovqat", en: "Food" },
  CONSTRUCTION: { ru: "Строительство", uz: "Qurilish", en: "Construction" },
  OTHER: { ru: "Прочее", uz: "Boshqa", en: "Other" },
};

export const FIELD_ORDER: LaboratoryField[] = [
  "TESTING",
  "METROLOGY",
  "MEDICINE",
  "ECOLOGY",
  "INDUSTRY",
  "AGRICULTURE",
  "FOOD",
  "CONSTRUCTION",
  "OTHER",
];

/**
 * A candidate as the directory returns them.
 *
 * `fullName` and the contact fields are absent for a caller who is not signed
 * in — the API omits them from the query rather than blanking them — so they
 * are optional here, and the page must not assume they arrived.
 */
export interface Candidate {
  id: string;
  headline: string;
  region: string | null;
  city: string | null;
  fields: LaboratoryField[];
  yearsExperience: number | null;
  summary: string;
  skills: string[];
  openToWork: boolean;
  updatedAt: string;
  fullName?: string;
  education?: string | null;
  certifications?: string | null;
  cvUrl?: string | null;
  contactEmail?: string;
  contactPhone?: string | null;
}

export interface MyCandidateProfile extends Candidate {
  fullName: string;
  contactEmail: string;
  visibility: CandidateVisibility;
}

export interface CandidatePage {
  items: Candidate[];
  total: number;
  page: number;
  pageSize: number;
  /** True when the caller was signed in, so names and contacts are present. */
  identified: boolean;
}

export interface CandidateQuery {
  q?: string;
  region?: string;
  field?: LaboratoryField | "";
  page?: number;
}

export function candidateSearchParams(query: CandidateQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.region) params.set("region", query.region);
  if (query.field) params.set("field", query.field);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
