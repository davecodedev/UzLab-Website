import type { Lang } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Real data shape only. Matches apps/api/src/modules/laboratories exactly —
// see apps/api/prisma/schema.prisma and GET /api/laboratories.
//
// Records come from two national registers, distinguished by `register`:
// AKKRED — Uzbekistan's national accreditation register (akkred.uz), which
// covers every conformity-assessment body, not only laboratories, so
// `isLaboratory` / `bodyType` distinguish them; and DEPSTAN — the
// testing-laboratory measurement-approval register (approval.depstan.uz),
// every row of which is a testing laboratory. The same organisation may hold
// authorisations in both registers under different numbers — those are two
// separate records, not duplicates.
//
// `scopeText` (the full scope-of-accreditation table) is deliberately NOT part
// of this type: the API omits it from list responses because it totals ~10.5 MB
// across the register. It is fetched only on the detail page.
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
  taxId: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  isUzLabMember: boolean;
  source: string;

  // National-register detail
  /** NationalRegister enum — AKKRED (akkred.uz) or DEPSTAN (approval.depstan.uz). */
  register: string | null;
  /** The register's own status wording, before mapping to `accreditationStatus`. */
  registerStatusLabel: string | null;
  bodyType: string | null;
  bodyTypeLabel: string | null;
  isLaboratory: boolean;
  legalEntityName: string | null;
  legalEntityAddress: string | null;
  supervisorName: string | null;
  standard: string | null;
  accreditationDate: string | null;
  reAccreditationDate: string | null;
  statusDate: string | null;
  certificateUrl: string | null;
  scopeUrl: string | null;
  directions: string[];
}

/** Sentinel filter/bucket value for records whose `region` column is null. */
export const UNSPECIFIED_REGION = "__unspecified__";

export interface RegistryFilters {
  regNo: string;
  orgName: string;
  /** NationalRegister — which national register a record came from. */
  register: string;
  /** ConformityBodyType — the register's own body-type discriminator. */
  bodyType: string;
  region: string;
  status: string;
  /** "RD — field of accreditation": matches the real `directions` sectors. */
  scope: string;
  keywords: string;
  /** "Normative document": matches the real `standard` column
   * (e.g. "O'z DSt ISO/IEC 17025:2019"). */
  standardDoc: string;
  /** STIR / tax identification number — real `taxId` column. */
  taxId: string;
  /** "Stakeholder Registry": matches real contact columns. */
  stakeholder: string;
  /** Restrict to laboratories, excluding certification/inspection bodies. */
  labsOnly: boolean;
}

export const EMPTY_FILTERS: RegistryFilters = {
  regNo: "",
  orgName: "",
  register: "",
  bodyType: "",
  region: "",
  status: "",
  scope: "",
  keywords: "",
  standardDoc: "",
  taxId: "",
  stakeholder: "",
  labsOnly: false,
};

export function hasActiveFilters(f: RegistryFilters): boolean {
  return Boolean(
    f.regNo ||
      f.orgName ||
      f.register ||
      f.bodyType ||
      f.region ||
      f.status ||
      f.scope ||
      f.keywords ||
      f.standardDoc ||
      f.taxId ||
      f.stakeholder ||
      f.labsOnly,
  );
}

// --- Localized option lists (real schema values only) ----------------------

interface LocalizedOption {
  value: string;
  label: Record<Lang, string>;
}

// NationalRegister enum. Record counts at time of import: 807 AKKRED
// (akkred.uz — O'zAkk accreditation), 2333 DEPSTAN (approval.depstan.uz —
// testing-laboratory measurement approval). A record created by hand has
// neither.
export const REGISTER_OPTIONS: LocalizedOption[] = [
  {
    value: "AKKRED",
    label: {
      ru: "Аккредитация (O'zAkk)",
      uz: "Akkreditatsiya (O'zAkk)",
      en: "Accreditation (O'zAkk)",
    },
  },
  {
    value: "DEPSTAN",
    label: {
      ru: "Одобрение испыт. лабораторий (Depstan)",
      uz: "Sinov laboratoriyalari ma'qullash (Depstan)",
      en: "Testing-lab approval (Depstan)",
    },
  },
];

// ConformityBodyType enum — every value in the Prisma schema, laboratories
// first. Counts in the live register at time of import: 401 testing,
// 146 metrology, 121 product cert, 41 management cert, 33 calibration,
// 26 NDT, 21 inspection, 5 proficiency, 4 service cert, 4 personnel cert,
// 3 medical, 2 reference-material.
export const BODY_TYPE_OPTIONS: LocalizedOption[] = [
  {
    value: "TESTING_LAB",
    label: { ru: "Испытательная лаборатория", uz: "Sinov laboratoriyasi", en: "Testing laboratory" },
  },
  {
    value: "METROLOGY_SERVICE",
    label: {
      ru: "Метрологическая служба поверки",
      uz: "Qiyoslash metrologiya xizmati",
      en: "Metrology verification service",
    },
  },
  {
    value: "CALIBRATION_LAB",
    label: {
      ru: "Калибровочная лаборатория",
      uz: "Kalibrlash laboratoriyasi",
      en: "Calibration laboratory",
    },
  },
  {
    value: "NDT_LAB",
    label: {
      ru: "Лаборатория неразрушающего контроля",
      uz: "Putur yetkazmasdan tekshirish laboratoriyasi",
      en: "Non-destructive testing laboratory",
    },
  },
  {
    value: "MEDICAL_LAB",
    label: { ru: "Медицинская лаборатория", uz: "Tibbiy laboratoriya", en: "Medical laboratory" },
  },
  {
    value: "PRODUCT_CERTIFICATION",
    label: {
      ru: "Орган по сертификации продукции",
      uz: "Mahsulot sertifikatlash organi",
      en: "Product certification body",
    },
  },
  {
    value: "MANAGEMENT_CERTIFICATION",
    label: {
      ru: "Орган по сертификации систем менеджмента",
      uz: "Menejment tizimlarini sertifikatlashtirish organi",
      en: "Management systems certification body",
    },
  },
  {
    value: "SERVICE_CERTIFICATION",
    label: {
      ru: "Орган по сертификации услуг",
      uz: "Xizmatlarni sertifikatlash organi",
      en: "Services certification body",
    },
  },
  {
    value: "PERSONNEL_CERTIFICATION",
    label: {
      ru: "Орган по сертификации персонала",
      uz: "Xodimlarni sertifikatlashtirish organi",
      en: "Personnel certification body",
    },
  },
  {
    value: "INSPECTION_BODY",
    label: { ru: "Инспекционный орган", uz: "Inspeksiya organi", en: "Inspection body" },
  },
  {
    value: "PROFICIENCY_PROVIDER",
    label: {
      ru: "Провайдер проверки квалификации",
      uz: "Malakani tekshirish provayderi",
      en: "Proficiency testing provider",
    },
  },
  {
    value: "REFERENCE_MATERIAL_PRODUCER",
    label: {
      ru: "Изготовитель стандартных образцов",
      uz: "Standart namunalar ishlab chiqaruvchi",
      en: "Reference material producer",
    },
  },
  { value: "OTHER_BODY", label: { ru: "Прочее", uz: "Boshqa", en: "Other" } },
];

/** Body types that are laboratories — mirrors LABORATORY_TYPES in the importer. */
export const LABORATORY_BODY_TYPES = new Set([
  "TESTING_LAB",
  "METROLOGY_SERVICE",
  "CALIBRATION_LAB",
  "NDT_LAB",
  "MEDICAL_LAB",
]);

// Region values are stored exactly as the national register spells them
// (Uzbek latin), so these `value` strings must match the database verbatim —
// only the display labels are translated.
export const REGION_OPTIONS: LocalizedOption[] = [
  { value: "Toshkent shahri", label: { ru: "г. Ташкент", uz: "Toshkent shahri", en: "Tashkent city" } },
  {
    value: "Toshkent viloyati",
    label: { ru: "Ташкентская обл.", uz: "Toshkent viloyati", en: "Tashkent region" },
  },
  {
    value: "Andijon viloyati",
    label: { ru: "Андижанская обл.", uz: "Andijon viloyati", en: "Andijan region" },
  },
  {
    value: "Buxoro viloyati",
    label: { ru: "Бухарская обл.", uz: "Buxoro viloyati", en: "Bukhara region" },
  },
  {
    value: "Farg'ona viloyati",
    label: { ru: "Ферганская обл.", uz: "Farg'ona viloyati", en: "Fergana region" },
  },
  {
    value: "Jizzax viloyati",
    label: { ru: "Джизакская обл.", uz: "Jizzax viloyati", en: "Jizzakh region" },
  },
  {
    value: "Qashqadaryo viloyati",
    label: { ru: "Кашкадарьинская обл.", uz: "Qashqadaryo viloyati", en: "Kashkadarya region" },
  },
  {
    value: "Xorazm viloyati",
    label: { ru: "Хорезмская обл.", uz: "Xorazm viloyati", en: "Khorezm region" },
  },
  {
    value: "Namangan viloyati",
    label: { ru: "Наманганская обл.", uz: "Namangan viloyati", en: "Namangan region" },
  },
  {
    value: "Navoiy viloyati",
    label: { ru: "Навоийская обл.", uz: "Navoiy viloyati", en: "Navoi region" },
  },
  {
    value: "Samarqand viloyati",
    label: { ru: "Самаркандская обл.", uz: "Samarqand viloyati", en: "Samarkand region" },
  },
  {
    value: "Surxondaryo viloyati",
    label: { ru: "Сурхандарьинская обл.", uz: "Surxondaryo viloyati", en: "Surkhandarya region" },
  },
  {
    value: "Sirdaryo viloyati",
    label: { ru: "Сырдарьинская обл.", uz: "Sirdaryo viloyati", en: "Sirdaryo region" },
  },
  {
    value: "Qoraqalpog'iston Respublikasi",
    label: { ru: "Каракалпакстан", uz: "Qoraqalpog'iston Respublikasi", en: "Karakalpakstan" },
  },
  // Foreign-registered bodies also appear in the national register.
  {
    value: "Rossiya Federatsiyasi",
    label: { ru: "Российская Федерация", uz: "Rossiya Federatsiyasi", en: "Russian Federation" },
  },
  {
    value: "Ozarbayjon Respublikasi",
    label: { ru: "Азербайджан", uz: "Ozarbayjon Respublikasi", en: "Azerbaijan" },
  },
  {
    value: "Tojikiston Respublikasi",
    label: { ru: "Таджикистан", uz: "Tojikiston Respublikasi", en: "Tajikistan" },
  },
  { value: "Armaniston", label: { ru: "Армения", uz: "Armaniston", en: "Armenia" } },
  { value: "Germaniya", label: { ru: "Германия", uz: "Germaniya", en: "Germany" } },
  { value: "Xitoy", label: { ru: "Китай", uz: "Xitoy", en: "China" } },
  {
    value: "Buyuk Britaniya",
    label: { ru: "Великобритания", uz: "Buyuk Britaniya", en: "United Kingdom" },
  },
  { value: "Yaponiya", label: { ru: "Япония", uz: "Yaponiya", en: "Japan" } },
  { value: "Shveytsariya", label: { ru: "Швейцария", uz: "Shveytsariya", en: "Switzerland" } },
  { value: "Qirg'iziston", label: { ru: "Кыргызстан", uz: "Qirg'iziston", en: "Kyrgyzstan" } },
];

export const UNSPECIFIED_REGION_LABEL: Record<Lang, string> = {
  ru: "Не указан",
  uz: "Ko'rsatilmagan",
  en: "Not specified",
};

// AccreditationStatus enum. The register distinguishes an accreditation ended
// outright (WITHDRAWN / "Tugagan") from one that lapsed on its own expiry
// date (EXPIRED / "Muddati tugagan").
export const STATUS_OPTIONS: LocalizedOption[] = [
  { value: "ACCREDITED", label: { ru: "Аккредитован", uz: "Amaldagi", en: "Accredited" } },
  { value: "SUSPENDED", label: { ru: "Приостановлен", uz: "To'xtagan", en: "Suspended" } },
  { value: "EXPIRED", label: { ru: "Истёк", uz: "Muddati tugagan", en: "Expired" } },
  { value: "WITHDRAWN", label: { ru: "Прекращён", uz: "Tugagan", en: "Withdrawn" } },
  { value: "PENDING", label: { ru: "На рассмотрении", uz: "Ko'rib chiqilmoqda", en: "Pending" } },
  { value: "UNKNOWN", label: { ru: "Неизвестно", uz: "Noma'lum", en: "Unknown" } },
];

export function labelFor(options: LocalizedOption[], value: string, lang: Lang): string {
  return options.find((o) => o.value === value)?.label[lang] ?? value;
}

export function registerLabel(value: string | null, lang: Lang): string {
  if (!value) return "—";
  return labelFor(REGISTER_OPTIONS, value, lang);
}

export function bodyTypeLabel(value: string | null, lang: Lang): string {
  if (!value) return "—";
  return labelFor(BODY_TYPE_OPTIONS, value, lang);
}

export function regionLabel(value: string | null, lang: Lang): string {
  if (!value) return UNSPECIFIED_REGION_LABEL[lang];
  return labelFor(REGION_OPTIONS, value, lang);
}

export function statusLabel(value: string, lang: Lang): string {
  return labelFor(STATUS_OPTIONS, value, lang);
}

// --- Matching ----------------------------------------------------------------

function includesCI(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function matches(lab: Laboratory, f: RegistryFilters): boolean {
  if (f.labsOnly && !lab.isLaboratory) return false;
  if (f.regNo && !includesCI(lab.accreditationNumber, f.regNo)) return false;
  if (f.orgName && !(includesCI(lab.name, f.orgName) || includesCI(lab.legalEntityName, f.orgName))) {
    return false;
  }
  if (f.register && lab.register !== f.register) return false;
  if (f.bodyType && lab.bodyType !== f.bodyType) return false;
  if (f.region) {
    if (f.region === UNSPECIFIED_REGION) {
      if (lab.region) return false;
    } else if (lab.region !== f.region) {
      return false;
    }
  }
  if (f.status && lab.accreditationStatus !== f.status) return false;
  if (f.scope) {
    const hay = [...lab.directions, lab.bodyTypeLabel ?? ""].join(" ");
    if (!includesCI(hay, f.scope)) return false;
  }
  if (f.keywords) {
    const hay = [
      lab.name,
      lab.legalEntityName ?? "",
      lab.accreditationNumber ?? "",
      lab.taxId ?? "",
      lab.standard ?? "",
      lab.directions.join(" "),
    ].join(" ");
    if (!includesCI(hay, f.keywords)) return false;
  }
  if (f.standardDoc && !includesCI(lab.standard, f.standardDoc)) return false;
  if (f.taxId && !includesCI(lab.taxId, f.taxId)) return false;
  if (f.stakeholder) {
    const hay = [
      lab.phone,
      lab.email,
      lab.website,
      lab.address,
      lab.legalEntityAddress,
      lab.supervisorName,
      lab.accreditationBody,
    ]
      .filter((v): v is string => Boolean(v))
      .join(" ");
    if (!includesCI(hay, f.stakeholder)) return false;
  }
  return true;
}

/** Human-readable summary of an active filter combo, for saved views / recent searches. */
export function composeFilterLabel(f: RegistryFilters, lang: Lang): string {
  const parts: string[] = [];
  const L = {
    regNo: { ru: "№", uz: "№", en: "No." },
    org: { ru: "Название", uz: "Nomi", en: "Name" },
    register: { ru: "Реестр", uz: "Reyestr", en: "Register" },
    type: { ru: "Тип", uz: "Turi", en: "Type" },
    region: { ru: "Регион", uz: "Hudud", en: "Region" },
    status: { ru: "Статус", uz: "Holat", en: "Status" },
    scope: { ru: "ОД", uz: "AD", en: "RD" },
    kw: { ru: "Ключевые слова", uz: "Kalit so'zlar", en: "Keywords" },
    standardDoc: { ru: "Документ", uz: "Hujjat", en: "Document" },
    taxId: { ru: "ИНН", uz: "STIR", en: "TIN" },
    stakeholder: { ru: "Реестр участников", uz: "Ishtirokchilar reyestri", en: "Stakeholder" },
    labsOnly: { ru: "Только лаборатории", uz: "Faqat laboratoriyalar", en: "Laboratories only" },
  } as const;

  if (f.labsOnly) parts.push(L.labsOnly[lang]);
  if (f.regNo) parts.push(`${L.regNo[lang]}: ${f.regNo}`);
  if (f.orgName) parts.push(`${L.org[lang]}: ${f.orgName}`);
  if (f.register) parts.push(`${L.register[lang]}: ${registerLabel(f.register, lang)}`);
  if (f.bodyType) parts.push(`${L.type[lang]}: ${bodyTypeLabel(f.bodyType, lang)}`);
  if (f.region) {
    parts.push(
      `${L.region[lang]}: ${regionLabel(f.region === UNSPECIFIED_REGION ? null : f.region, lang)}`,
    );
  }
  if (f.status) parts.push(`${L.status[lang]}: ${statusLabel(f.status, lang)}`);
  if (f.scope) parts.push(`${L.scope[lang]}: ${f.scope}`);
  if (f.keywords) parts.push(`${L.kw[lang]}: ${f.keywords}`);
  if (f.standardDoc) parts.push(`${L.standardDoc[lang]}: ${f.standardDoc}`);
  if (f.taxId) parts.push(`${L.taxId[lang]}: ${f.taxId}`);
  if (f.stakeholder) parts.push(`${L.stakeholder[lang]}: ${f.stakeholder}`);

  return parts.join(" · ");
}
