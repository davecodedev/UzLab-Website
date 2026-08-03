import type { Lang } from "@/lib/i18n";
import {
  bodyTypeLabel,
  isSelfRegistered,
  regionLabel,
  registerLabel,
  statusLabel,
  type Laboratory,
} from "./registry-data";

// Column keys, in export order. Every one is backed by a real field on the
// `Laboratory` payload returned by GET /api/laboratories — `scopeText` is
// deliberately absent (it is not part of the list response).
type ColumnKey =
  | "regNo"
  | "org"
  | "register"
  | "bodyType"
  | "taxId"
  | "legalEntity"
  | "legalAddress"
  | "supervisor"
  | "standard"
  | "directions"
  | "region"
  | "city"
  | "address"
  | "phone"
  | "email"
  | "website"
  | "status"
  | "registerStatusLabel"
  | "statusDate"
  | "body"
  | "accreditedFrom"
  | "reAccredited"
  | "until"
  | "certificateUrl"
  | "scopeUrl";

const EXPORT_HEADERS: Record<Lang, Record<ColumnKey, string>> = {
  ru: {
    regNo: "Рег. номер",
    org: "Организация",
    register: "Реестр",
    bodyType: "Тип органа",
    taxId: "ИНН (СТИР)",
    legalEntity: "Юридическое лицо",
    legalAddress: "Юридический адрес",
    supervisor: "Руководитель",
    standard: "Нормативный документ",
    directions: "Направления",
    region: "Регион",
    city: "Город",
    address: "Адрес",
    phone: "Телефон",
    email: "Эл. почта",
    website: "Сайт",
    status: "Статус",
    registerStatusLabel: "Статус по реестру",
    statusDate: "Дата статуса",
    body: "Орган аккредитации",
    accreditedFrom: "Дата аккредитации",
    reAccredited: "Дата переаккредитации",
    until: "Действует до",
    certificateUrl: "Аттестат (ссылка)",
    scopeUrl: "Область аккредитации (ссылка)",
  },
  uz: {
    regNo: "Ro'yxat raqami",
    org: "Tashkilot",
    register: "Reyestr",
    bodyType: "Organ turi",
    taxId: "STIR",
    legalEntity: "Yuridik shaxs",
    legalAddress: "Yuridik manzil",
    supervisor: "Rahbar",
    standard: "Normativ hujjat",
    directions: "Yo'nalishlar",
    region: "Hudud",
    city: "Shahar",
    address: "Manzil",
    phone: "Telefon",
    email: "Elektron pochta",
    website: "Veb-sayt",
    status: "Holat",
    registerStatusLabel: "Reyestrdagi holat",
    statusDate: "Holat sanasi",
    body: "Akkreditatsiya organi",
    accreditedFrom: "Akkreditatsiya sanasi",
    reAccredited: "Qayta akkreditatsiya sanasi",
    until: "Amal qilish muddati",
    certificateUrl: "Attestat (havola)",
    scopeUrl: "Akkreditatsiya sohasi (havola)",
  },
  en: {
    regNo: "Reg. No.",
    org: "Organization",
    register: "Register",
    bodyType: "Body type",
    taxId: "TIN (STIR)",
    legalEntity: "Legal entity",
    legalAddress: "Legal address",
    supervisor: "Supervisor",
    standard: "Normative document",
    directions: "Directions",
    region: "Region",
    city: "City",
    address: "Address",
    phone: "Phone",
    email: "Email",
    website: "Website",
    status: "Status",
    registerStatusLabel: "Status per the register",
    statusDate: "Status date",
    body: "Accreditation body",
    accreditedFrom: "Accreditation date",
    reAccredited: "Re-accreditation date",
    until: "Valid until",
    certificateUrl: "Certificate (link)",
    scopeUrl: "Scope of accreditation (link)",
  },
};

const COLUMN_ORDER = Object.keys(EXPORT_HEADERS.en) as ColumnKey[];

function fmtDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("ru-RU");
}

function exportColumns(lab: Laboratory, lang: Lang): Record<string, string> {
  const headers = EXPORT_HEADERS[lang];
  return {
    [headers.regNo]: lab.accreditationNumber ?? "",
    [headers.org]: lab.name,
    // Member-added entries have no register but are still labelled, so an
    // exported row says where it came from rather than leaving the cell blank.
    [headers.register]:
      lab.register || isSelfRegistered(lab) ? registerLabel(lab.register ?? null, lang, lab.source) : "",
    [headers.bodyType]: lab.bodyType ? bodyTypeLabel(lab.bodyType, lang) : (lab.bodyTypeLabel ?? ""),
    [headers.taxId]: lab.taxId ?? "",
    [headers.legalEntity]: lab.legalEntityName ?? "",
    [headers.legalAddress]: lab.legalEntityAddress ?? "",
    [headers.supervisor]: lab.supervisorName ?? "",
    [headers.standard]: lab.standard ?? "",
    [headers.directions]: lab.directions.join("; "),
    [headers.region]: lab.region ? regionLabel(lab.region, lang) : "",
    [headers.city]: lab.city ?? "",
    [headers.address]: lab.address ?? "",
    [headers.phone]: lab.phone ?? "",
    [headers.email]: lab.email ?? "",
    [headers.website]: lab.website ?? "",
    [headers.status]: statusLabel(lab.accreditationStatus ?? "UNKNOWN", lang),
    // The source register's own wording, verbatim — never translated.
    [headers.registerStatusLabel]: lab.registerStatusLabel ?? "",
    [headers.statusDate]: fmtDate(lab.statusDate),
    [headers.body]: lab.accreditationBody ?? "",
    [headers.accreditedFrom]: fmtDate(lab.accreditationDate),
    [headers.reAccredited]: fmtDate(lab.reAccreditationDate),
    [headers.until]: fmtDate(lab.accreditedUntil ?? null),
    [headers.certificateUrl]: lab.certificateUrl ?? "",
    [headers.scopeUrl]: lab.scopeUrl ?? "",
  };
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCsv(laboratories: Laboratory[], lang: Lang) {
  const rows = laboratories.map((lab) => exportColumns(lab, lang));
  const headers = COLUMN_ORDER.map((k) => EXPORT_HEADERS[lang][k]);
  const lines = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];
  const csv = lines.map((line) => line.map((v) => csvEscape(String(v))).join(",")).join("\n");
  // Leading BOM so Excel opens Cyrillic content as UTF-8 correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, "registry.csv");
}

export async function exportXlsx(laboratories: Laboratory[], lang: Lang) {
  const XLSX = await import("xlsx");
  const rows = laboratories.map((lab) => exportColumns(lab, lang));
  const headerRow = COLUMN_ORDER.map((k) => EXPORT_HEADERS[lang][k]);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headerRow });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registry");
  XLSX.writeFile(workbook, "registry.xlsx");
}

export function printPdf() {
  window.print();
}
