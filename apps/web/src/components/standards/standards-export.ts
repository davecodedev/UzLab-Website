import type { Lang } from "@/lib/i18n";
import { formatDateNumeric } from "@/lib/format";
import {
  REGISTER_LABELS,
  STATUS_LABELS,
  type StandardListItem,
} from "@/lib/standards";

/**
 * Downloading the catalogue, the same way the registry does.
 *
 * Deliberately a sibling of the registry's export rather than a generalisation
 * of it: the two share the mechanics — CSV escaping, the UTF-8 BOM, the anchor
 * click — but nothing about their columns. Folding them together would mean a
 * column list with `laboratory | standard` branches through it, which is harder
 * to read than two short files.
 */

const HEADERS: Record<Lang, Record<string, string>> = {
  ru: {
    designation: "Обозначение",
    title: "Наименование",
    source: "Источник",
    status: "Состояние",
    statusLabel: "Формулировка источника",
    ics: "Классификация (ICS)",
    category: "Категория",
    language: "Язык",
    year: "Год",
    pages: "Объём, с.",
    effectiveFrom: "Введён с",
    effectiveUntil: "Действителен до",
    committee: "Технический комитет",
    url: "Ссылка на источник",
  },
  uz: {
    designation: "Belgilanish",
    title: "Nomi",
    source: "Manba",
    status: "Holati",
    statusLabel: "Manba ifodasi",
    ics: "Tasniflash (ICS)",
    category: "Toifa",
    language: "Til",
    year: "Yil",
    pages: "Hajmi, bet",
    effectiveFrom: "Kuchga kirgan",
    effectiveUntil: "Amal qiladi",
    committee: "Texnik qo'mita",
    url: "Manba havolasi",
  },
  en: {
    designation: "Designation",
    title: "Title",
    source: "Source",
    status: "Status",
    statusLabel: "Source's own wording",
    ics: "Classification (ICS)",
    category: "Category",
    language: "Language",
    year: "Year",
    pages: "Pages",
    effectiveFrom: "In force from",
    effectiveUntil: "Valid until",
    committee: "Technical committee",
    url: "Source link",
  },
};

const COLUMN_ORDER = [
  "designation",
  "title",
  "source",
  "status",
  "statusLabel",
  "ics",
  "category",
  "language",
  "year",
  "pages",
  "effectiveFrom",
  "effectiveUntil",
  "committee",
  "url",
] as const;

function row(item: StandardListItem, lang: Lang): Record<string, string> {
  const h = HEADERS[lang];
  return {
    [h.designation]: item.designation,
    [h.title]: item.title,
    [h.source]: REGISTER_LABELS[item.register]?.[lang] ?? item.register,
    [h.status]: STATUS_LABELS[item.status]?.[lang] ?? item.status,
    // The catalogue's own wording travels with the mapped status, so a reader
    // checking a downloaded row against the source sees the same words.
    [h.statusLabel]: item.statusLabel ?? "",
    [h.ics]: item.icsCode
      ? `${item.icsCode}${item.icsLabel ? ` — ${item.icsLabel}` : ""}`
      : "",
    [h.category]: item.category ?? "",
    [h.language]: item.language ?? "",
    [h.year]: item.year ? String(item.year) : "",
    [h.pages]: item.pageCount ? String(item.pageCount) : "",
    [h.effectiveFrom]: formatDateNumeric(item.effectiveFrom, lang) ?? "",
    [h.effectiveUntil]: formatDateNumeric(item.effectiveUntil, lang) ?? "",
    [h.committee]: item.technicalCommittee ?? "",
    [h.url]: item.sourceUrl,
  };
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
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

export function exportStandardsCsv(items: StandardListItem[], lang: Lang) {
  const headers = COLUMN_ORDER.map((k) => HEADERS[lang][k]);
  const rows = items.map((item) => row(item, lang));
  const lines = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];
  const csv = lines
    .map((line) => line.map((v) => csvEscape(String(v))).join(","))
    .join("\n");
  // Leading BOM so Excel reads the Cyrillic and Uzbek content as UTF-8.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, "standards.csv");
}

export async function exportStandardsXlsx(items: StandardListItem[], lang: Lang) {
  const XLSX = await import("xlsx");
  const headerRow = COLUMN_ORDER.map((k) => HEADERS[lang][k]);
  const worksheet = XLSX.utils.json_to_sheet(
    items.map((item) => row(item, lang)),
    { header: headerRow },
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Standards");
  XLSX.writeFile(workbook, "standards.xlsx");
}

export function printStandards() {
  window.print();
}
