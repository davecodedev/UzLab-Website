"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ServiceNotice } from "@/components/ServiceNotice";
import {
  exportStandardsCsv,
  exportStandardsXlsx,
  printStandards,
} from "./standards-export";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import {
  EMPTY_QUERY,
  REGISTER_LABELS,
  STANDARDS_PATH,
  STATUS_LABELS,
  isFiltered,
  statusTone,
  toSearchParams,
  type StandardListItem,
  type StandardRegister,
  type StandardStatus,
  type StandardsFacets,
  type StandardsPage,
  type StandardsQuery,
} from "@/lib/standards";

/**
 * The catalogue is paged on the server, so an export has to gather the matching
 * rows first. Bounded because "everything" can be 68 657 records — and when the
 * bound bites the reader is told, rather than being handed a short file that
 * looks complete.
 */
const EXPORT_CAP = 5000;
const EXPORT_PAGE_SIZE = 100;

const T = {
  heading: {
    ru: "Каталог стандартов",
    uz: "Standartlar katalogi",
    en: "Standards catalogue",
  },
  intro: {
    ru: "Документы, на соответствие которым аккредитуются лаборатории — из национального каталога Узбекистана и межгосударственного каталога ГОСТ. Поиск работает на любом языке и в любой графике.",
    uz: "Laboratoriyalar akkreditatsiyadan o'tadigan hujjatlar — O'zbekiston milliy katalogi va davlatlararo GOST katalogidan. Qidiruv istalgan til va yozuvda ishlaydi.",
    en: "The documents laboratories are accredited against, from Uzbekistan's national catalogue and the interstate GOST catalogue. Search works in any language or script.",
  },
  search: {
    ru: "Обозначение, название или ключевое слово",
    uz: "Belgilanish, nomi yoki kalit so'z",
    en: "Designation, title or keyword",
  },
  source: { ru: "Источник", uz: "Manba", en: "Source" },
  status: { ru: "Состояние", uz: "Holati", en: "Status" },
  ics: { ru: "Классификация (ICS)", uz: "Tasniflash (ICS)", en: "Classification (ICS)" },
  language: { ru: "Язык", uz: "Til", en: "Language" },
  year: { ru: "Год", uz: "Yil", en: "Year" },
  from: { ru: "с", uz: "dan", en: "from" },
  to: { ru: "по", uz: "gacha", en: "to" },
  any: { ru: "Любой", uz: "Har qanday", en: "Any" },
  sort: { ru: "Сортировка", uz: "Tartiblash", en: "Sort" },
  sortNewest: { ru: "Сначала новые", uz: "Avval yangilari", en: "Newest first" },
  sortOldest: { ru: "Сначала старые", uz: "Avval eskilari", en: "Oldest first" },
  sortDesignation: { ru: "По обозначению", uz: "Belgilanish bo'yicha", en: "By designation" },
  reset: { ru: "Сбросить фильтры", uz: "Filtrlarni tozalash", en: "Clear filters" },
  found: { ru: "Найдено документов", uz: "Topilgan hujjatlar", en: "Documents found" },
  none: {
    ru: "Ничего не найдено. Попробуйте другое обозначение или снимите часть фильтров.",
    uz: "Hech narsa topilmadi. Boshqa belgilanishni sinab ko'ring yoki filtrlarning bir qismini olib tashlang.",
    en: "Nothing found. Try another designation, or clear some of the filters.",
  },
  failed: {
    ru: "Не удалось загрузить каталог. Проверьте соединение и попробуйте ещё раз.",
    uz: "Katalogni yuklab bo'lmadi. Ulanishni tekshiring va qaytadan urinib ko'ring.",
    en: "Could not load the catalogue. Check the connection and try again.",
  },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
  prev: { ru: "Назад", uz: "Orqaga", en: "Previous" },
  next: { ru: "Вперёд", uz: "Oldinga", en: "Next" },
  page: { ru: "Страница", uz: "Sahifa", en: "Page" },
  of: { ru: "из", uz: "dan", en: "of" },
  pages: { ru: "с.", uz: "b.", en: "pp." },
  export: { ru: "Экспорт", uz: "Eksport", en: "Export" },
  exportCsv: { ru: "Скачать CSV", uz: "CSV yuklab olish", en: "Download CSV" },
  exportXlsx: { ru: "Скачать XLSX", uz: "XLSX yuklab olish", en: "Download XLSX" },
  exportPrint: { ru: "Печать / PDF", uz: "Chop etish / PDF", en: "Print / PDF" },
  preparing: { ru: "Готовим файл…", uz: "Fayl tayyorlanmoqda…", en: "Preparing the file…" },
  capped: {
    ru: `Выгружены первые ${EXPORT_CAP.toLocaleString("ru-RU")} записей из`,
    uz: `Dastlabki ${EXPORT_CAP.toLocaleString("ru-RU")} ta yozuv yuklandi, jami`,
    en: `Exported the first ${EXPORT_CAP.toLocaleString("en-GB")} records of`,
  },
} as const;

const SELECT_CLASS =
  "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2";
const SELECT_STYLE = {
  background: "var(--uz-bg-raised)",
  border: "1px solid var(--uz-border)",
  color: "var(--uz-text)",
} as const;

export function StandardsApp() {
  const { lang } = useLang();
  const [query, setQuery] = useState<StandardsQuery>(EMPTY_QUERY);
  const [text, setText] = useState("");
  const [result, setResult] = useState<StandardsPage | null>(null);
  const [facets, setFacets] = useState<StandardsFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Typing must not fire a request per keystroke, and a slow response for
  // "GOS" must never overwrite the results for "GOST" — hence the sequence
  // number, the same guard the registry search uses.
  const seq = useRef(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery((q) => (q.q === text ? q : { ...q, q: text, page: 1 }));
    }, 300);
    return () => clearTimeout(handle);
  }, [text]);

  useEffect(() => {
    const mine = ++seq.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request starts here, so this is where it becomes in-flight
    setLoading(true);
    api
      .get<StandardsPage>(`${STANDARDS_PATH}${toSearchParams(query)}`)
      .then((page) => {
        if (mine !== seq.current) return;
        setResult(page);
        setFailed(false);
      })
      .catch(() => {
        if (mine !== seq.current) return;
        setFailed(true);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [query]);

  useEffect(() => {
    api
      .get<StandardsFacets>(`${STANDARDS_PATH}/facets`)
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  const update = useCallback((patch: Partial<StandardsQuery>) => {
    // Any filter change returns to the first page: page 7 of the old result
    // set is meaningless against the new one.
    setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));
  }, []);

  const reset = useCallback(() => {
    setText("");
    setQuery(EMPTY_QUERY);
  }, []);

  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  /** Walks the matching pages up to the cap, then hands them to the writer. */
  const collect = useCallback(async (): Promise<StandardListItem[] | null> => {
    const gathered: StandardListItem[] = [];
    for (let page = 1; gathered.length < EXPORT_CAP; page++) {
      const params = toSearchParams({ ...query, page });
      const separator = params ? "&" : "?";
      const body = await api.get<StandardsPage>(
        `${STANDARDS_PATH}${params}${separator}pageSize=${EXPORT_PAGE_SIZE}`,
      );
      gathered.push(...body.items);
      if (body.items.length < EXPORT_PAGE_SIZE || gathered.length >= body.total) break;
    }
    return gathered;
  }, [query]);

  const runExport = useCallback(
    async (write: (items: StandardListItem[], lang: Lang) => void) => {
      setExporting(true);
      setExportNote(null);
      try {
        const items = await collect();
        if (!items?.length) return;
        write(items, lang);
        const total = result?.total ?? items.length;
        if (items.length < total) {
          setExportNote(`${pick(T.capped, lang)} ${formatNumber(total, lang)}`);
        }
      } catch {
        setExportNote(pick(T.failed, lang));
      } finally {
        setExporting(false);
      }
    },
    [collect, result, lang],
  );

  // Nothing ever loaded and the service is unreachable: show the same notice
  // the registry does rather than an empty catalogue with a filter sidebar.
  if (failed && !result) return <ServiceNotice />;

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-8">
      <h1
        className="text-3xl font-extrabold md:text-4xl"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {pick(T.heading, lang)}
      </h1>
      <p className="mt-3 max-w-[80ch] text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.intro, lang)}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-5">
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--uz-text-faint)" }}
            >
              {pick(T.search, lang)}
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={pick(T.search, lang)}
              className={SELECT_CLASS}
              style={SELECT_STYLE}
            />
          </div>

          <Facet label={pick(T.source, lang)}>
            <select
              value={query.register ?? ""}
              onChange={(e) => update({ register: e.target.value as StandardRegister | "" })}
              className={SELECT_CLASS}
              style={SELECT_STYLE}
            >
              <option value="">{pick(T.any, lang)}</option>
              {facets?.registers.map((r) => (
                <option key={r.value} value={r.value}>
                  {pick(REGISTER_LABELS[r.value], lang)} ({formatNumber(r.count, lang)})
                </option>
              ))}
            </select>
          </Facet>

          <Facet label={pick(T.status, lang)}>
            <select
              value={query.status ?? ""}
              onChange={(e) => update({ status: e.target.value as StandardStatus | "" })}
              className={SELECT_CLASS}
              style={SELECT_STYLE}
            >
              <option value="">{pick(T.any, lang)}</option>
              {facets?.statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {pick(STATUS_LABELS[s.value], lang)} ({formatNumber(s.count, lang)})
                </option>
              ))}
            </select>
          </Facet>

          <Facet label={pick(T.ics, lang)}>
            <select
              value={query.ics ?? ""}
              onChange={(e) => update({ ics: e.target.value })}
              className={SELECT_CLASS}
              style={SELECT_STYLE}
            >
              <option value="">{pick(T.any, lang)}</option>
              {facets?.ics.map((i) => (
                <option key={i.code ?? ""} value={i.code ?? ""}>
                  {i.code} — {i.label} ({formatNumber(i.count, lang)})
                </option>
              ))}
            </select>
          </Facet>

          {facets?.languages.length ? (
            <Facet label={pick(T.language, lang)}>
              <select
                value={query.language ?? ""}
                onChange={(e) => update({ language: e.target.value })}
                className={SELECT_CLASS}
                style={SELECT_STYLE}
              >
                <option value="">{pick(T.any, lang)}</option>
                {facets.languages.map((l) => (
                  <option key={l.value ?? ""} value={l.value ?? ""}>
                    {l.value} ({formatNumber(l.count, lang)})
                  </option>
                ))}
              </select>
            </Facet>
          ) : null}

          <Facet label={pick(T.year, lang)}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder={facets?.yearRange.min ? String(facets.yearRange.min) : pick(T.from, lang)}
                value={query.yearFrom ?? ""}
                onChange={(e) => update({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
                className={SELECT_CLASS}
                style={SELECT_STYLE}
              />
              <span style={{ color: "var(--uz-text-faint)" }}>—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={facets?.yearRange.max ? String(facets.yearRange.max) : pick(T.to, lang)}
                value={query.yearTo ?? ""}
                onChange={(e) => update({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
                className={SELECT_CLASS}
                style={SELECT_STYLE}
              />
            </div>
          </Facet>

          <Facet label={pick(T.sort, lang)}>
            <select
              value={query.sort ?? "newest"}
              onChange={(e) => update({ sort: e.target.value as StandardsQuery["sort"] })}
              className={SELECT_CLASS}
              style={SELECT_STYLE}
            >
              <option value="newest">{pick(T.sortNewest, lang)}</option>
              <option value="oldest">{pick(T.sortOldest, lang)}</option>
              <option value="designation">{pick(T.sortDesignation, lang)}</option>
            </select>
          </Facet>

          {isFiltered(query) && (
            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold underline underline-offset-2"
              style={{ color: "var(--uz-blue-600)" }}
            >
              {pick(T.reset, lang)}
            </button>
          )}
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <ExportButton
              label={pick(T.exportCsv, lang)}
              disabled={exporting || !result?.total}
              onClick={() => void runExport(exportStandardsCsv)}
            />
            <ExportButton
              label={pick(T.exportXlsx, lang)}
              disabled={exporting || !result?.total}
              onClick={() => void runExport(exportStandardsXlsx)}
            />
            <ExportButton
              label={pick(T.exportPrint, lang)}
              disabled={!result?.total}
              onClick={() => printStandards()}
            />
          </div>

          {(exporting || exportNote) && (
            <p className="mb-3 text-xs" style={{ color: "var(--uz-text-muted)" }}>
              {exporting ? pick(T.preparing, lang) : exportNote}
            </p>
          )}

          <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
            {loading && !result ? (
              pick(T.loading, lang)
            ) : (
              <>
                {pick(T.found, lang)}:{" "}
                <span className="font-bold" style={{ color: "var(--uz-text)" }}>
                  {formatNumber(result?.total ?? 0, lang)}
                </span>
              </>
            )}
          </p>

          {failed && (
            <p
              className="mt-4 rounded-xl px-5 py-4 text-sm"
              style={{
                background: "var(--uz-warning-bg)",
                border: "1px solid var(--uz-warning)",
                color: "var(--uz-text)",
              }}
            >
              {pick(T.failed, lang)}
            </p>
          )}

          {!failed && result?.items.length === 0 && (
            <p className="mt-6 text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {pick(T.none, lang)}
            </p>
          )}

          <ul
            className="mt-4 space-y-3"
            // Dimmed rather than blanked while reloading: replacing the list
            // with a spinner on every filter change loses the reader's place.
            style={{ opacity: loading ? 0.55 : 1, transition: "opacity 120ms" }}
          >
            {result?.items.map((item) => (
              <StandardRow key={item.id} item={item} lang={lang} />
            ))}
          </ul>

          {result && result.total > result.pageSize && (
            <nav className="mt-8 flex items-center justify-between gap-4">
              <PagerButton
                disabled={result.page <= 1}
                onClick={() => update({ page: result.page - 1 })}
                label={pick(T.prev, lang)}
              />
              <span className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
                {pick(T.page, lang)} {formatNumber(result.page, lang)} {pick(T.of, lang)}{" "}
                {formatNumber(totalPages, lang)}
              </span>
              <PagerButton
                disabled={result.page >= totalPages}
                onClick={() => update({ page: result.page + 1 })}
                label={pick(T.next, lang)}
              />
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function Facet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--uz-text-faint)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PagerButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
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

function StandardRow({ item, lang }: { item: StandardListItem; lang: "ru" | "uz" | "en" }) {
  const tone = statusTone(item.status);
  return (
    <li
      className="rounded-xl px-5 py-4"
      style={{ background: "var(--uz-bg-raised)", border: "1px solid var(--uz-border)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href={`/standards/${item.slug}`}
          className="text-sm font-bold underline-offset-2 hover:underline"
          style={{ color: "var(--uz-navy-900)", fontFamily: "var(--uz-font-mono)" }}
        >
          {item.designation}
        </Link>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {pick(STATUS_LABELS[item.status], lang)}
        </span>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
        {item.title}
      </p>

      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
        <span>{pick(REGISTER_LABELS[item.register], lang)}</span>
        {item.icsCode && (
          <span>
            {item.icsCode}
            {item.icsLabel ? ` — ${item.icsLabel}` : ""}
          </span>
        )}
        {item.year && <span>{item.year}</span>}
        {item.language && <span>{item.language}</span>}
      </p>
    </li>
  );
}

function ExportButton({
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
      className="reg-print-hide rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
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
