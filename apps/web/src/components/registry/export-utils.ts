import type { Lang } from "@/lib/i18n";
import { fieldLabel, regionLabel, statusLabel, type Laboratory } from "./registry-data";

function exportColumns(lab: Laboratory, lang: Lang): Record<string, string> {
  const headers = EXPORT_HEADERS[lang];
  return {
    [headers.regNo]: lab.accreditationNumber ?? "",
    [headers.org]: lab.name,
    [headers.type]: lab.fields.map((f) => fieldLabel(f, lang)).join(", "),
    [headers.region]: regionLabel(lab.region, lang),
    [headers.status]: statusLabel(lab.accreditationStatus, lang),
    [headers.body]: lab.accreditationBody ?? "",
    [headers.until]: lab.accreditedUntil ? new Date(lab.accreditedUntil).toLocaleDateString("ru-RU") : "",
    [headers.city]: lab.city ?? "",
  };
}

const EXPORT_HEADERS: Record<Lang, Record<"regNo" | "org" | "type" | "region" | "status" | "body" | "until" | "city", string>> = {
  ru: {
    regNo: "Рег. номер",
    org: "Организация",
    type: "Тип",
    region: "Регион",
    status: "Статус",
    body: "Орган аккредитации",
    until: "Действует до",
    city: "Город",
  },
  uz: {
    regNo: "Ro'yxat raqami",
    org: "Tashkilot",
    type: "Turi",
    region: "Hudud",
    status: "Holat",
    body: "Akkreditatsiya organi",
    until: "Amal qilish muddati",
    city: "Shahar",
  },
  en: {
    regNo: "Reg. No.",
    org: "Organization",
    type: "Type",
    region: "Region",
    status: "Status",
    body: "Accreditation body",
    until: "Valid until",
    city: "City",
  },
};

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
  const headers = Object.keys(EXPORT_HEADERS[lang]).map((k) => EXPORT_HEADERS[lang][k as keyof (typeof EXPORT_HEADERS)["ru"]]);
  const lines = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];
  const csv = lines.map((line) => line.map((v) => csvEscape(String(v))).join(",")).join("\n");
  // Leading BOM so Excel opens Cyrillic content as UTF-8 correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, "registry.csv");
}

export async function exportXlsx(laboratories: Laboratory[], lang: Lang) {
  const XLSX = await import("xlsx");
  const rows = laboratories.map((lab) => exportColumns(lab, lang));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registry");
  XLSX.writeFile(workbook, "registry.xlsx");
}

export function printPdf() {
  window.print();
}
