import type { Lang } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Real data shape only. Matches apps/api/src/modules/laboratories exactly —
// see apps/api/prisma/schema.prisma (LaboratoryField / AccreditationStatus
// enums) and GET /api/laboratories.
// ---------------------------------------------------------------------------

export interface Laboratory {
  id: string;
  name: string;
  slug: string;
  fields: string[];
  accreditationNumber: string | null;
  accreditationBody: string | null;
  accreditationStatus: string;
  accreditedUntil: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  isUzLabMember: boolean;
  source: string;
}

/** Sentinel filter/bucket value for records whose `region` column is null. */
export const UNSPECIFIED_REGION = "__unspecified__";

export interface RegistryFilters {
  regNo: string;
  orgName: string;
  fieldType: string;
  region: string;
  status: string;
  /** "RD — field of accreditation" in the design. No dedicated schema column
   * for accreditation scope exists, so this matches against the real (if
   * currently always-null) `description` column — honest against a real
   * field, just sparse until labs have descriptions on file. */
  scope: string;
  keywords: string;
  /** "Normative document" in the design. Same reasoning as `scope` — there's
   * no dedicated "operates under standard X" column, so this also matches
   * `description` as a second, independent substring requirement. */
  standardDoc: string;
  /** "Stakeholder Registry" in the design — matches real contact-ish columns
   * (phone/email/website/address/accreditationBody), not a fake field. */
  stakeholder: string;
}

export const EMPTY_FILTERS: RegistryFilters = {
  regNo: "",
  orgName: "",
  fieldType: "",
  region: "",
  status: "",
  scope: "",
  keywords: "",
  standardDoc: "",
  stakeholder: "",
};

export function hasActiveFilters(f: RegistryFilters): boolean {
  return Boolean(
    f.regNo ||
      f.orgName ||
      f.fieldType ||
      f.region ||
      f.status ||
      f.scope ||
      f.keywords ||
      f.standardDoc ||
      f.stakeholder,
  );
}

// --- Localized option lists (real schema values only) ----------------------

interface LocalizedOption {
  value: string;
  label: Record<Lang, string>;
}

// LaboratoryField enum — every value that exists in the Prisma schema. Only
// TESTING / METROLOGY / MEDICINE currently have real records, but all are
// real, selectable schema values (per project instructions).
export const FIELD_OPTIONS: LocalizedOption[] = [
  {
    value: "TESTING",
    label: { ru: "Испытательная лаборатория", uz: "Sinov laboratoriyasi", en: "Testing laboratory" },
  },
  {
    value: "METROLOGY",
    label: {
      ru: "Метрологическая / калибровочная служба",
      uz: "Metrologiya / kalibrlash xizmati",
      en: "Metrology / calibration service",
    },
  },
  {
    value: "MEDICINE",
    label: { ru: "Медицинская лаборатория", uz: "Tibbiyot laboratoriyasi", en: "Medical laboratory" },
  },
  {
    value: "ECOLOGY",
    label: { ru: "Экологическая лаборатория", uz: "Ekologik laboratoriya", en: "Ecology laboratory" },
  },
  {
    value: "INDUSTRY",
    label: { ru: "Промышленная лаборатория", uz: "Sanoat laboratoriyasi", en: "Industrial laboratory" },
  },
  {
    value: "AGRICULTURE",
    label: {
      ru: "Сельскохозяйственная лаборатория",
      uz: "Qishloq xo'jaligi laboratoriyasi",
      en: "Agricultural laboratory",
    },
  },
  {
    value: "FOOD",
    label: { ru: "Лаборатория пищевой продукции", uz: "Oziq-ovqat laboratoriyasi", en: "Food laboratory" },
  },
  {
    value: "CONSTRUCTION",
    label: { ru: "Строительная лаборатория", uz: "Qurilish laboratoriyasi", en: "Construction laboratory" },
  },
  { value: "OTHER", label: { ru: "Прочее", uz: "Boshqa", en: "Other" } },
];

// Real Uzbekistan regions only (14) — canonical value strings match the ones
// already established in the codebase for the `region` column, kept for
// consistency even though the column is null on every current record.
export const REGION_OPTIONS: LocalizedOption[] = [
  { value: "Каракалпакстан", label: { ru: "Каракалпакстан", uz: "Qoraqalpog'iston", en: "Karakalpakstan" } },
  {
    value: "Андижанская обл.",
    label: { ru: "Андижанская обл.", uz: "Andijon viloyati", en: "Andijan region" },
  },
  { value: "Бухарская обл.", label: { ru: "Бухарская обл.", uz: "Buxoro viloyati", en: "Bukhara region" } },
  {
    value: "Ферганская обл.",
    label: { ru: "Ферганская обл.", uz: "Farg'ona viloyati", en: "Fergana region" },
  },
  {
    value: "Джизакская обл.",
    label: { ru: "Джизакская обл.", uz: "Jizzax viloyati", en: "Jizzakh region" },
  },
  {
    value: "Кашкадарьинская обл.",
    label: { ru: "Кашкадарьинская обл.", uz: "Qashqadaryo viloyati", en: "Kashkadarya region" },
  },
  { value: "Хорезмская обл.", label: { ru: "Хорезмская обл.", uz: "Xorazm viloyati", en: "Khorezm region" } },
  {
    value: "Наманганская обл.",
    label: { ru: "Наманганская обл.", uz: "Namangan viloyati", en: "Namangan region" },
  },
  { value: "Навоийская обл.", label: { ru: "Навоийская обл.", uz: "Navoiy viloyati", en: "Navoi region" } },
  {
    value: "Самаркандская обл.",
    label: { ru: "Самаркандская обл.", uz: "Samarqand viloyati", en: "Samarkand region" },
  },
  {
    value: "Сурхандарьинская обл.",
    label: { ru: "Сурхандарьинская обл.", uz: "Surxondaryo viloyati", en: "Surkhandarya region" },
  },
  {
    value: "Сырдарьинская обл.",
    label: { ru: "Сырдарьинская обл.", uz: "Sirdaryo viloyati", en: "Sirdaryo region" },
  },
  {
    value: "Ташкентская обл.",
    label: { ru: "Ташкентская обл.", uz: "Toshkent viloyati", en: "Tashkent region" },
  },
  { value: "г. Ташкент", label: { ru: "г. Ташкент", uz: "Toshkent shahri", en: "Tashkent city" } },
];

export const UNSPECIFIED_REGION_LABEL: Record<Lang, string> = {
  ru: "Не указан",
  uz: "Ko'rsatilmagan",
  en: "Not specified",
};

// AccreditationStatus enum — all 5 values exist in the schema; only
// ACCREDITED currently has real records.
export const STATUS_OPTIONS: LocalizedOption[] = [
  { value: "ACCREDITED", label: { ru: "Аккредитован", uz: "Akkreditatsiya qilingan", en: "Accredited" } },
  { value: "PENDING", label: { ru: "На рассмотрении", uz: "Ko'rib chiqilmoqda", en: "Pending" } },
  { value: "SUSPENDED", label: { ru: "Приостановлен", uz: "To'xtatilgan", en: "Suspended" } },
  { value: "EXPIRED", label: { ru: "Истёк", uz: "Muddati tugagan", en: "Expired" } },
  { value: "UNKNOWN", label: { ru: "Неизвестно", uz: "Noma'lum", en: "Unknown" } },
];

export function labelFor(options: LocalizedOption[], value: string, lang: Lang): string {
  return options.find((o) => o.value === value)?.label[lang] ?? value;
}

export function fieldLabel(value: string, lang: Lang): string {
  return labelFor(FIELD_OPTIONS, value, lang);
}

export function regionLabel(value: string | null, lang: Lang): string {
  if (!value) return UNSPECIFIED_REGION_LABEL[lang];
  return labelFor(REGION_OPTIONS, value, lang);
}

export function statusLabel(value: string, lang: Lang): string {
  return labelFor(STATUS_OPTIONS, value, lang);
}

// --- Matching ----------------------------------------------------------------

export function matches(lab: Laboratory, f: RegistryFilters): boolean {
  if (f.regNo && !(lab.accreditationNumber ?? "").toLowerCase().includes(f.regNo.toLowerCase())) {
    return false;
  }
  if (f.orgName && !lab.name.toLowerCase().includes(f.orgName.toLowerCase())) {
    return false;
  }
  if (f.fieldType && !lab.fields.includes(f.fieldType)) {
    return false;
  }
  if (f.region) {
    if (f.region === UNSPECIFIED_REGION) {
      if (lab.region) return false;
    } else if (lab.region !== f.region) {
      return false;
    }
  }
  if (f.status && lab.accreditationStatus !== f.status) {
    return false;
  }
  if (f.scope && !(lab.description ?? "").toLowerCase().includes(f.scope.toLowerCase())) {
    return false;
  }
  if (f.keywords) {
    const kw = f.keywords.toLowerCase();
    const haystack = [lab.name, lab.accreditationNumber ?? "", lab.fields.join(" ")]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(kw)) return false;
  }
  if (f.standardDoc && !(lab.description ?? "").toLowerCase().includes(f.standardDoc.toLowerCase())) {
    return false;
  }
  if (f.stakeholder) {
    const sh = f.stakeholder.toLowerCase();
    const haystack = [lab.phone, lab.email, lab.website, lab.address, lab.accreditationBody]
      .filter((v): v is string => Boolean(v))
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(sh)) return false;
  }
  return true;
}

/** Human-readable summary of an active filter combo, for saved views / recent searches. */
export function composeFilterLabel(f: RegistryFilters, lang: Lang): string {
  const parts: string[] = [];
  const L = {
    regNo: { ru: "№", uz: "№", en: "No." },
    org: { ru: "Название", uz: "Nomi", en: "Name" },
    type: { ru: "Тип", uz: "Turi", en: "Type" },
    region: { ru: "Регион", uz: "Hudud", en: "Region" },
    status: { ru: "Статус", uz: "Holat", en: "Status" },
    scope: { ru: "ОД", uz: "AD", en: "RD" },
    kw: { ru: "Ключевые слова", uz: "Kalit so'zlar", en: "Keywords" },
    standardDoc: { ru: "Документ", uz: "Hujjat", en: "Document" },
    stakeholder: { ru: "Реестр участников", uz: "Ishtirokchilar reyestri", en: "Stakeholder" },
  } as const;

  if (f.regNo) parts.push(`${L.regNo[lang]}: ${f.regNo}`);
  if (f.orgName) parts.push(`${L.org[lang]}: ${f.orgName}`);
  if (f.fieldType) parts.push(`${L.type[lang]}: ${fieldLabel(f.fieldType, lang)}`);
  if (f.region) parts.push(`${L.region[lang]}: ${regionLabel(f.region === UNSPECIFIED_REGION ? null : f.region, lang)}`);
  if (f.status) parts.push(`${L.status[lang]}: ${statusLabel(f.status, lang)}`);
  if (f.scope) parts.push(`${L.scope[lang]}: ${f.scope}`);
  if (f.keywords) parts.push(`${L.kw[lang]}: ${f.keywords}`);
  if (f.standardDoc) parts.push(`${L.standardDoc[lang]}: ${f.standardDoc}`);
  if (f.stakeholder) parts.push(`${L.stakeholder[lang]}: ${f.stakeholder}`);

  return parts.join(" · ");
}
