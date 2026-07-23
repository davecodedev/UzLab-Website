"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Laboratory {
  id: string;
  name: string;
  slug: string;
  fields: string[];
  accreditationNumber: string | null;
  accreditationStatus: string;
  region: string | null;
  city: string | null;
  isUzLabMember: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  ACCREDITED: "Аккредитован",
  SUSPENDED: "Приостановлен",
  EXPIRED: "Истёк",
  PENDING: "На рассмотрении",
  UNKNOWN: "Неизвестно",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACCREDITED: { bg: "var(--uz-success-bg)", color: "var(--uz-success)" },
  SUSPENDED: { bg: "var(--uz-amber-100)", color: "var(--uz-amber-700)" },
  EXPIRED: { bg: "var(--uz-error-bg)", color: "var(--uz-error)" },
  PENDING: { bg: "var(--uz-blue-50)", color: "var(--uz-blue-700)" },
  UNKNOWN: { bg: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" },
};

const STATUS_ORDER = ["ACCREDITED", "PENDING", "SUSPENDED", "EXPIRED"];

function statusBadge(status: string) {
  const c = STATUS_COLORS[status] ?? { bg: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" };
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(laboratories: Laboratory[]) {
  const header = ["Название", "Рег. номер", "Тип", "Статус", "Регион", "Город"];
  const rows = laboratories.map((lab) => [
    lab.name,
    lab.accreditationNumber ?? "",
    lab.fields.join("; "),
    STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus,
    lab.region ?? "",
    lab.city ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "laboratories.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function LaboratoryResults({ laboratories }: { laboratories: Laboratory[] }) {
  const [view, setView] = useState<"table" | "cards">("cards");

  const summary = useMemo(() => {
    const total = laboratories.length;
    const statusCounts: Record<string, number> = {};
    for (const lab of laboratories) {
      statusCounts[lab.accreditationStatus] = (statusCounts[lab.accreditationStatus] ?? 0) + 1;
    }

    const regionCounts = new Map<string, number>();
    for (const lab of laboratories) {
      if (lab.region) {
        regionCounts.set(lab.region, (regionCounts.get(lab.region) ?? 0) + 1);
      }
    }
    const regionsWithData = regionCounts.size;
    let topRegion: string | null = null;
    let topRegionCount = 0;
    for (const [region, count] of regionCounts) {
      if (count > topRegionCount) {
        topRegion = region;
        topRegionCount = count;
      }
    }

    return { total, statusCounts, regionsWithData, topRegion, topRegionCount };
  }, [laboratories]);

  const sentence =
    summary.regionsWithData > 0 && summary.topRegion
      ? `${summary.total} лабораторий в ${summary.regionsWithData} регионах, больше всего в «${summary.topRegion}» (${summary.topRegionCount}) — аккредитовано: ${summary.statusCounts.ACCREDITED ?? 0}`
      : `${summary.total} лабораторий найдено`;

  return (
    <div>
      <div
        className="rounded-xl bg-white p-5"
        style={{ border: "1px solid var(--uz-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--uz-text)" }}>
          {sentence}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_ORDER.filter((s) => summary.statusCounts[s]).map((s) => (
            <span
              key={s}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].color }}
            >
              {STATUS_LABELS[s]}: {summary.statusCounts[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          Показано {laboratories.length} из {laboratories.length} записей
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex overflow-hidden rounded-md"
            style={{ border: "1px solid var(--uz-border-strong)" }}
          >
            <button
              type="button"
              onClick={() => setView("cards")}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                view === "cards"
                  ? { background: "var(--uz-blue-600)", color: "white" }
                  : { background: "white", color: "var(--uz-text-muted)" }
              }
            >
              Карточки
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                view === "table"
                  ? { background: "var(--uz-blue-600)", color: "white" }
                  : { background: "white", color: "var(--uz-text-muted)" }
              }
            >
              Таблица
            </button>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(laboratories)}
            disabled={laboratories.length === 0}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
          >
            Экспорт CSV
          </button>
        </div>
      </div>

      {laboratories.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--uz-text-muted)" }}>
          Лаборатории не найдены.
        </p>
      ) : view === "cards" ? (
        <div
          className="mt-4 overflow-hidden rounded-xl bg-white"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          {laboratories.map((lab, i) => (
            <Link
              key={lab.id}
              href={`/laboratories/${lab.slug}`}
              className="block px-6 py-4 transition-colors hover:bg-[var(--uz-blue-50)]"
              style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
            >
              <span className="font-medium" style={{ color: "var(--uz-ink)" }}>
                {lab.name}
              </span>
              {lab.isUzLabMember && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
                >
                  Член UzLab
                </span>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {statusBadge(lab.accreditationStatus)}
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  {[
                    lab.fields.join(", "),
                    [lab.city, lab.region].filter(Boolean).join(", "),
                    lab.accreditationNumber,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="mt-4 overflow-x-auto rounded-xl bg-white"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--uz-bg-sunken)" }}>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  Рег. №
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  Организация
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  Тип
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  Регион
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--uz-text-faint)" }}
                >
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {laboratories.map((lab, i) => (
                <tr
                  key={lab.id}
                  style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
                >
                  <td
                    className="px-4 py-3 align-top whitespace-nowrap"
                    style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-muted)" }}
                  >
                    {lab.accreditationNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/laboratories/${lab.slug}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--uz-ink)" }}
                    >
                      {lab.name}
                    </Link>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--uz-text-faint)" }}>
                      {lab.fields.join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top" style={{ color: "var(--uz-text-muted)" }}>
                    {lab.fields[0] ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top" style={{ color: "var(--uz-text-muted)" }}>
                    {[lab.city, lab.region].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 align-top">{statusBadge(lab.accreditationStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
