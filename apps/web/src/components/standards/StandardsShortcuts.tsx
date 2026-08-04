"use client";

import { pick, type Lang } from "@/lib/i18n";
import type { StandardsRecent, StandardsView } from "./storage";

/**
 * The catalogue's saved views and recent searches.
 *
 * Written against the site-wide `--uz-*` tokens rather than reusing the
 * registry's versions: those are styled by a `--reg-*` palette scoped to that
 * page's subtree, so lifting them here would drag the whole local design system
 * along with them. The behaviour is shared through `@/lib/list-storage`, which
 * is the part worth sharing.
 */

const T = {
  saved: { ru: "Мои подборки", uz: "Mening to'plamlarim", en: "My saved views" },
  save: { ru: "Сохранить фильтры", uz: "Filtrlarni saqlash", en: "Save these filters" },
  removeView: { ru: "Удалить подборку", uz: "To'plamni o'chirish", en: "Remove saved view" },
  recent: { ru: "Недавние поиски", uz: "So'nggi qidiruvlar", en: "Recent searches" },
  clear: { ru: "Очистить", uz: "Tozalash", en: "Clear" },
} as const;

export function SavedViewsBar({
  lang,
  views,
  canSave,
  onApply,
  onRemove,
  onSave,
}: {
  lang: Lang;
  views: StandardsView[];
  /** Saving an empty filter set would store "everything", so the button hides. */
  canSave: boolean;
  onApply: (view: StandardsView) => void;
  onRemove: (id: string) => void;
  onSave: () => void;
}) {
  if (!views.length && !canSave) return null;

  return (
    <div className="reg-print-hide mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
        {pick(T.saved, lang)}
      </span>

      {views.map((view) => (
        <span
          key={view.id}
          className="flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-xs"
          style={{ background: "var(--uz-bg-raised)", border: "1px solid var(--uz-border)" }}
        >
          <button
            type="button"
            onClick={() => onApply(view)}
            className="font-semibold"
            style={{ color: "var(--uz-text)" }}
          >
            {view.name}
          </button>
          <button
            type="button"
            onClick={() => onRemove(view.id)}
            aria-label={pick(T.removeView, lang)}
            className="rounded-full px-1 leading-none"
            style={{ color: "var(--uz-text-faint)" }}
          >
            ×
          </button>
        </span>
      ))}

      {canSave && (
        <button
          type="button"
          onClick={onSave}
          className="rounded-full px-3 py-0.5 text-xs font-semibold"
          style={{ border: "1px dashed var(--uz-border-strong)", color: "var(--uz-blue-600)" }}
        >
          + {pick(T.save, lang)}
        </button>
      )}
    </div>
  );
}

export function RecentSearchesCard({
  lang,
  entries,
  onApply,
  onClear,
}: {
  lang: Lang;
  entries: StandardsRecent[];
  onApply: (entry: StandardsRecent) => void;
  onClear: () => void;
}) {
  if (!entries.length) return null;

  return (
    <div
      className="reg-print-hide rounded-xl px-4 py-3"
      style={{ background: "var(--uz-bg-raised)", border: "1px solid var(--uz-border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.recent, lang)}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(T.clear, lang)}
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.label}>
            <button
              type="button"
              onClick={() => onApply(entry)}
              className="text-left text-sm leading-snug underline-offset-2 hover:underline"
              style={{ color: "var(--uz-text)" }}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
