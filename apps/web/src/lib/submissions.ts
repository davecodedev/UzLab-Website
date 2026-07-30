// Shapes and option lists for the member-submission endpoints
// (apps/api/src/modules/laboratories — POST /laboratories/submissions and
// GET /laboratories/submissions/mine).
//
// A submission is a laboratory that appears in neither national register, so
// the member supplies every field themselves. The field list mirrors
// SubmitLaboratoryDto exactly: the API whitelists strictly and rejects any
// other key with a 400, and every field here is read by one of the registry
// filters in components/registry/registry-data.ts — omitting one would make
// member entries invisible to that filter.

import type { Lang } from "@/lib/i18n";

/**
 * Exactly the keys `SubmitLaboratoryDto` whitelists, and nothing else.
 * Optional keys are omitted rather than sent empty: an empty `email` would
 * fail `@IsEmail`, and empty strings would be stored as real values.
 */
export interface SubmitLaboratoryPayload {
  name: string;
  bodyType: string;
  accreditationStatus: string;
  fields?: string[];
  accreditationNumber?: string;
  accreditationBody?: string;
  standard?: string;
  /** ISO date string (yyyy-mm-dd) — `@IsDateString`. */
  accreditationDate?: string;
  /** ISO date string (yyyy-mm-dd) — `@IsDateString`. */
  accreditedUntil?: string;
  region?: string;
  city?: string;
  address?: string;
  taxId?: string;
  legalEntityName?: string;
  legalEntityAddress?: string;
  supervisorName?: string;
  phone?: string;
  email?: string;
  website?: string;
  directions?: string[];
  description?: string;
  isUzLabMember?: boolean;
}

/** The Laboratory row POST /laboratories/submissions creates. */
export interface SubmittedLaboratory {
  id: string;
  name: string;
  slug: string;
}

// --- Uploaded documents -----------------------------------------------------
// POST /laboratories/submissions/analyze reads a PDF and suggests field values
// without saving anything; POST /laboratories/submissions/:id/documents/:kind
// attaches the file once the laboratory exists.

/** `LaboratoryDocumentKind` in prisma/schema.prisma. */
export type LaboratoryDocumentKind = "CERTIFICATE" | "SCOPE";

export const DOCUMENT_KINDS: LaboratoryDocumentKind[] = ["CERTIFICATE", "SCOPE"];

/** `MAX_DOCUMENT_BYTES` in apps/api/src/modules/laboratories/documents.service.ts. */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

/**
 * The form fields the analyzer can suggest a value for. It is deliberately
 * conservative — a key is present only when the text matched with confidence,
 * so most documents fill in only some of these.
 */
export const SUGGESTIBLE_FIELDS = [
  "accreditationNumber",
  "taxId",
  "standard",
  "email",
  "phone",
  "region",
] as const;

export type SuggestibleField = (typeof SUGGESTIBLE_FIELDS)[number];

export type DocumentSuggestions = Partial<Record<SuggestibleField, string>>;

/** Response of POST /laboratories/submissions/analyze. Nothing is stored. */
export interface AnalyzedDocument {
  kind: LaboratoryDocumentKind;
  filename: string;
  sizeBytes: number;
  characters: number;
  suggested: DocumentSuggestions;
  /** First ~400 characters, so the member can confirm we read the right file. */
  preview: string;
}

/** Document metadata as it travels with a laboratory record. */
export interface LaboratoryDocumentMeta {
  id: string;
  kind: LaboratoryDocumentKind;
  filename: string;
  sizeBytes: number;
}

/** Public route that streams a stored PDF inline. Pass to `apiUrl`. */
export function laboratoryDocumentPath(
  laboratoryId: string,
  kind: LaboratoryDocumentKind,
): string {
  return `/laboratories/${laboratoryId}/documents/${kind}`;
}

const SIZE_UNITS: Record<Lang, { kb: string; mb: string }> = {
  ru: { kb: "КБ", mb: "МБ" },
  uz: { kb: "KB", mb: "MB" },
  en: { kb: "KB", mb: "MB" },
};

export function formatFileSize(bytes: number, lang: Lang): string {
  const units = SIZE_UNITS[lang];
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} ${units.mb}`;
  return `${Math.max(1, Math.round(bytes / 1024))} ${units.kb}`;
}

/**
 * One entry of GET /laboratories/submissions/mine — the Laboratory row the
 * member created. Only the fields the account page reads are declared.
 *
 * Review state is encoded across three columns rather than a status enum:
 * `reviewedAt` null means it is still queued, `isPublished` true means it went
 * live, and `deletedAt` set means it was rejected (the row is kept so the
 * reviewer's note survives).
 */
export interface MySubmission {
  id: string;
  name: string;
  slug: string;
  accreditationNumber: string | null;
  bodyType: string | null;
  region: string | null;
  accreditationStatus: string;
  isPublished: boolean;
  reviewNote: string | null;
  reviewedAt: string | null;
  deletedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export type SubmissionState = "pending" | "published" | "rejected";

export function submissionState(s: MySubmission): SubmissionState {
  if (s.deletedAt) return "rejected";
  if (s.isPublished) return "published";
  return "pending";
}

// --- Option lists -----------------------------------------------------------
// Body type, region and accreditation status are imported from
// registry-data.ts instead of being redeclared, so a submitted value always
// matches what the registry filters compare against.

interface LocalizedOption {
  value: string;
  label: Record<Lang, string>;
}

/** LaboratoryField enum — labels match FIELD_LABELS in LaboratoryDetailView. */
export const LABORATORY_FIELD_OPTIONS: LocalizedOption[] = [
  { value: "TESTING", label: { ru: "Испытания", uz: "Sinovlar", en: "Testing" } },
  { value: "METROLOGY", label: { ru: "Метрология", uz: "Metrologiya", en: "Metrology" } },
  { value: "MEDICINE", label: { ru: "Медицина", uz: "Tibbiyot", en: "Medicine" } },
  { value: "ECOLOGY", label: { ru: "Экология", uz: "Ekologiya", en: "Ecology" } },
  { value: "INDUSTRY", label: { ru: "Промышленность", uz: "Sanoat", en: "Industry" } },
  {
    value: "AGRICULTURE",
    label: { ru: "Сельское хозяйство", uz: "Qishloq xo'jaligi", en: "Agriculture" },
  },
  {
    value: "FOOD",
    label: { ru: "Пищевая продукция", uz: "Oziq-ovqat mahsulotlari", en: "Food products" },
  },
  { value: "CONSTRUCTION", label: { ru: "Строительство", uz: "Qurilish", en: "Construction" } },
  { value: "OTHER", label: { ru: "Прочее", uz: "Boshqa", en: "Other" } },
];

/**
 * The sector values ("RD — field of accreditation") that actually occur in the
 * registry's `directions` column, verbatim. The scope filter does a substring
 * match against this exact text, so the strings must not be normalised,
 * translated or spell-corrected — including the two spellings of the
 * non-destructive-testing sector, both of which are present in the data.
 */
export const DIRECTION_VALUES: string[] = [
  "Qishloq xo'jaligi",
  "Атестация рабочих мест",
  "Ветеринария",
  "ГБО",
  "Игрушки",
  "Карантин",
  "Лаборатория неразрушаюшего контроля",
  "Лаборатория неразрушающего контроля",
  "Машиностроение и продукция тяжелой промышленности",
  "Медицинская",
  "Металлическая лаборатория",
  "Пищевая продукция",
  "Продукция легкой прошмышенности",
  "Продукция химической промышленности",
  "Прочие",
  "Спортивные снаряды, инвентарь и оборудование",
  "Строительная продукция",
  "Табачная продукция",
  "текстильная продукция",
  "Технический осмотр",
  "Топливо и энергетическая продукция",
  "Фармацевтическая продукция",
  "Экология",
  "Электрическая продукция",
];

/** `@ArrayMaxSize(30)` on `directions`. */
export const DIRECTIONS_MAX = 30;

/** `@MinLength(3)` on `name`. */
export const NAME_MIN_LENGTH = 3;
