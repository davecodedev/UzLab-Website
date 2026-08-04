"use client";

import { useLang, pick } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";

const T = {
  prev: { ru: "Назад", uz: "Orqaga", en: "Previous" },
  next: { ru: "Вперёд", uz: "Oldinga", en: "Next" },
  page: { ru: "Страница", uz: "Sahifa", en: "Page" },
  of: { ru: "из", uz: "dan", en: "of" },
  showing: { ru: "Показаны", uz: "Ko'rsatilgan", en: "Showing" },
} as const;

/**
 * Paging for lists rendered from data the browser already holds.
 *
 * Shared rather than written twice: the member directory and the registry page
 * the same way and should behave the same way, down to what the counter says
 * when there is only one page.
 */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { lang } = useLang();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  // A single page needs no controls; showing a disabled pager just adds noise.
  if (pages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.showing, lang)} {formatNumber(first, lang)}–{formatNumber(last, lang)}{" "}
        {pick(T.of, lang)} {formatNumber(total, lang)}
      </p>

      <div className="flex items-center gap-3">
        <PagerButton
          label={pick(T.prev, lang)}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        <span className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.page, lang)} {formatNumber(page, lang)} {pick(T.of, lang)}{" "}
          {formatNumber(pages, lang)}
        </span>
        <PagerButton
          label={pick(T.next, lang)}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </nav>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
      style={{
        background: "var(--uz-bg-raised)",
        border: "1px solid var(--uz-border)",
        color: "var(--uz-text)",
      }}
    >
      {label}
    </button>
  );
}

/** Slices a list for the current page. */
export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
