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
import { formatDecimal } from "@/lib/format";

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
  if (mb >= 1) return `${formatDecimal(mb, lang)} ${units.mb}`;
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

/**
 * How to *show* each of those values. The value itself is what the filter
 * matches on and must stay verbatim, so the label is a separate lookup rather
 * than a rewrite of the list above — including for the two misspellings, which
 * are shown correctly even though they are stored as the register wrote them.
 */
export const DIRECTION_LABELS: Record<string, { ru: string; uz: string; en: string }> = {
  "Qishloq xo'jaligi": {
    ru: "Сельское хозяйство",
    uz: "Qishloq xo'jaligi",
    en: "Agriculture",
  },
  "Атестация рабочих мест": {
    ru: "Аттестация рабочих мест",
    uz: "Ish joylarini attestatsiyalash",
    en: "Workplace attestation",
  },
  Ветеринария: { ru: "Ветеринария", uz: "Veterinariya", en: "Veterinary medicine" },
  ГБО: {
    ru: "ГБО (газобаллонное оборудование)",
    uz: "GBO (gaz-ballon uskunalari)",
    en: "LPG vehicle equipment",
  },
  Игрушки: { ru: "Игрушки", uz: "O'yinchoqlar", en: "Toys" },
  Карантин: { ru: "Карантин", uz: "Karantin", en: "Quarantine" },
  "Лаборатория неразрушаюшего контроля": {
    ru: "Лаборатория неразрушающего контроля",
    uz: "Buzmasdan nazorat qilish laboratoriyasi",
    en: "Non-destructive testing laboratory",
  },
  "Лаборатория неразрушающего контроля": {
    ru: "Лаборатория неразрушающего контроля",
    uz: "Buzmasdan nazorat qilish laboratoriyasi",
    en: "Non-destructive testing laboratory",
  },
  "Машиностроение и продукция тяжелой промышленности": {
    ru: "Машиностроение и продукция тяжёлой промышленности",
    uz: "Mashinasozlik va og'ir sanoat mahsulotlari",
    en: "Mechanical engineering and heavy industry products",
  },
  Медицинская: { ru: "Медицинская", uz: "Tibbiyot", en: "Medical" },
  "Металлическая лаборатория": {
    ru: "Металлическая лаборатория",
    uz: "Metall laboratoriyasi",
    en: "Metals laboratory",
  },
  "Пищевая продукция": {
    ru: "Пищевая продукция",
    uz: "Oziq-ovqat mahsulotlari",
    en: "Food products",
  },
  "Продукция легкой прошмышенности": {
    ru: "Продукция лёгкой промышленности",
    uz: "Yengil sanoat mahsulotlari",
    en: "Light industry products",
  },
  "Продукция химической промышленности": {
    ru: "Продукция химической промышленности",
    uz: "Kimyo sanoati mahsulotlari",
    en: "Chemical industry products",
  },
  Прочие: { ru: "Прочие", uz: "Boshqalar", en: "Other" },
  "Спортивные снаряды, инвентарь и оборудование": {
    ru: "Спортивные снаряды, инвентарь и оборудование",
    uz: "Sport anjomlari, inventar va uskunalar",
    en: "Sports apparatus, gear and equipment",
  },
  "Строительная продукция": {
    ru: "Строительная продукция",
    uz: "Qurilish mahsulotlari",
    en: "Construction products",
  },
  "Табачная продукция": {
    ru: "Табачная продукция",
    uz: "Tamaki mahsulotlari",
    en: "Tobacco products",
  },
  "текстильная продукция": {
    ru: "Текстильная продукция",
    uz: "To'qimachilik mahsulotlari",
    en: "Textile products",
  },
  "Технический осмотр": {
    ru: "Технический осмотр",
    uz: "Texnik ko'rik",
    en: "Technical inspection",
  },
  "Топливо и энергетическая продукция": {
    ru: "Топливо и энергетическая продукция",
    uz: "Yoqilg'i va energetika mahsulotlari",
    en: "Fuel and energy products",
  },
  "Фармацевтическая продукция": {
    ru: "Фармацевтическая продукция",
    uz: "Farmatsevtika mahsulotlari",
    en: "Pharmaceutical products",
  },
  Экология: { ru: "Экология", uz: "Ekologiya", en: "Ecology" },
  "Электрическая продукция": {
    ru: "Электрическая продукция",
    uz: "Elektr mahsulotlari",
    en: "Electrical products",
  },
};

/** Falls back to the register's own wording for a value with no label yet. */
export function directionLabel(value: string, lang: Lang): string {
  const label = DIRECTION_LABELS[value];
  return label ? label[lang] : value;
}

/** `@ArrayMaxSize(30)` on `directions`. */
export const DIRECTIONS_MAX = 30;

/** `@MinLength(3)` on `name`. */
export const NAME_MIN_LENGTH = 3;
