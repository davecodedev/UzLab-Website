"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLang, pick } from "@/lib/i18n";
import { formatNumber, formatRelative } from "@/lib/format";
import { CandidateProfileForm } from "./CandidateProfileForm";
import {
  CAREERS_PATH,
  EMPLOYMENT_LABELS,
  toSearchParams,
  type EmploymentType,
  type Vacancy,
  type VacancyFacets,
  type VacancyPage,
  type VacancyQuery,
} from "@/lib/careers";

const T = {
  heading: { ru: "ОТКРЫТЫЕ ВАКАНСИИ", uz: "OCHIQ VAKANSIYALAR", en: "OPEN VACANCIES" },
  search: {
    ru: "Должность или организация",
    uz: "Lavozim yoki tashkilot",
    en: "Job title or organisation",
  },
  allRegions: { ru: "Все регионы", uz: "Barcha hududlar", en: "All regions" },
  allTypes: { ru: "Любая занятость", uz: "Har qanday bandlik", en: "Any employment type" },
  count: { ru: "вакансий", uz: "ta vakansiya", en: "vacancies" },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
  emptyHeading: {
    ru: "Пока нет открытых вакансий",
    uz: "Hozircha ochiq vakansiyalar yo'q",
    en: "No open vacancies yet",
  },
  emptyBody: {
    ru: "Как только работодатели разместят объявления, они появятся здесь. Если вы нанимаете — перейдите на вкладку работодателя.",
    uz: "Ish beruvchilar e'lon joylashtirishi bilan ular shu yerda paydo bo'ladi. Agar siz ishga olayotgan bo'lsangiz — ish beruvchi bo'limiga o'ting.",
    en: "As soon as employers post openings they will appear here. If you are hiring, switch to the employer track.",
  },
  noMatch: {
    ru: "Ничего не найдено. Попробуйте изменить запрос или снять фильтры.",
    uz: "Hech narsa topilmadi. So'rovni o'zgartiring yoki filtrlarni olib tashlang.",
    en: "Nothing found. Try a different search, or clear the filters.",
  },
  urgent: { ru: "Срочно", uz: "Shoshilinch", en: "Urgent" },
  prev: { ru: "Назад", uz: "Orqaga", en: "Previous" },
  next: { ru: "Вперёд", uz: "Oldinga", en: "Next" },
  page: { ru: "Страница", uz: "Sahifa", en: "Page" },
  of: { ru: "из", uz: "dan", en: "of" },
} as const;

const controlClass = "rounded-lg px-3 py-2 text-sm outline-none";
const controlStyle = {
  background: "#ffffff",
  border: "1px solid var(--uz-border)",
  color: "var(--uz-text)",
} as const;

export function SeekerTrack() {
  const { lang } = useLang();
  const [query, setQuery] = useState<VacancyQuery>({ page: 1 });
  const [text, setText] = useState("");
  const [result, setResult] = useState<VacancyPage | null>(null);
  const [facets, setFacets] = useState<VacancyFacets | null>(null);
  const [loading, setLoading] = useState(true);
  // Stamped when a page arrives rather than read during render: "2 days ago"
  // has to be computed from a fixed moment, or rendering is not a pure function
  // of state and the server and client disagree on the first paint.
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery((q) => (q.q === text ? q : { ...q, q: text, page: 1 }));
    }, 300);
    return () => clearTimeout(handle);
  }, [text]);

  useEffect(() => {
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request starts here, so this is where it becomes in-flight
    setLoading(true);
    api
      .get<VacancyPage>(`${CAREERS_PATH}/vacancies${toSearchParams(query)}`)
      .then((page) => {
        if (!current) return;
        setResult(page);
        setLoadedAt(Date.now());
      })
      .catch(() => current && setResult({ items: [], total: 0, page: 1, pageSize: 20 }))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [query]);

  useEffect(() => {
    api
      .get<VacancyFacets>(`${CAREERS_PATH}/vacancies/facets`)
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  const total = result?.total ?? 0;
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  // An empty board and an empty result set need different words: one says the
  // board is new, the other says the filters are too narrow.
  const boardIsEmpty = total === 0 && !query.q && !query.region && !query.employmentType;

  return (
    <div className="mt-8">
      <Kicker label={pick(T.heading, lang)} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={pick(T.search, lang)}
          className={`flex-1 ${controlClass}`}
          style={controlStyle}
        />
        <select
          value={query.region ?? ""}
          onChange={(e) => setQuery((q) => ({ ...q, region: e.target.value, page: 1 }))}
          className={controlClass}
          style={controlStyle}
        >
          <option value="">{pick(T.allRegions, lang)}</option>
          {facets?.regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.value} ({formatNumber(r.count, lang)})
            </option>
          ))}
        </select>
        <select
          value={query.employmentType ?? ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              employmentType: e.target.value as EmploymentType | "",
              page: 1,
            }))
          }
          className={controlClass}
          style={controlStyle}
        >
          <option value="">{pick(T.allTypes, lang)}</option>
          {facets?.employmentTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {pick(EMPLOYMENT_LABELS[t.value], lang)} ({formatNumber(t.count, lang)})
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-[13px] font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {loading && !result
          ? pick(T.loading, lang)
          : `${formatNumber(total, lang)} ${pick(T.count, lang)}`}
      </p>

      {total > 0 && (
        <div
          className="mt-3 overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: "var(--uz-border)", opacity: loading ? 0.55 : 1, transition: "opacity 120ms" }}
        >
          {result?.items.map((vacancy, idx) => (
            <VacancyRow key={vacancy.id} vacancy={vacancy} first={idx === 0} now={loadedAt} />
          ))}
        </div>
      )}

      {total === 0 && !loading && (
        <div
          className="mt-3 rounded-xl border bg-white px-6 py-10 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {pick(boardIsEmpty ? T.emptyHeading : T.noMatch, lang)}
          </p>
          {boardIsEmpty && (
            <p className="mx-auto mt-2 max-w-[52ch] text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
              {pick(T.emptyBody, lang)}
            </p>
          )}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4">
          <PagerButton
            label={pick(T.prev, lang)}
            disabled={(result?.page ?? 1) <= 1}
            onClick={() => setQuery((q) => ({ ...q, page: (result?.page ?? 1) - 1 }))}
          />
          <span className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.page, lang)} {formatNumber(result?.page ?? 1, lang)} {pick(T.of, lang)}{" "}
            {formatNumber(pages, lang)}
          </span>
          <PagerButton
            label={pick(T.next, lang)}
            disabled={(result?.page ?? 1) >= pages}
            onClick={() => setQuery((q) => ({ ...q, page: (result?.page ?? 1) + 1 }))}
          />
        </nav>
      )}

      {/* The other half of a job board: being found, not only searching. */}
      <CandidateProfileForm />
    </div>
  );
}

function VacancyRow({
  vacancy,
  first,
  now,
}: {
  vacancy: Vacancy;
  first: boolean;
  now: number;
}) {
  const { lang } = useLang();
  const place = [vacancy.city, vacancy.region].filter(Boolean).join(", ");

  return (
    <Link
      href={`/career/${vacancy.slug}`}
      className="flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-[var(--uz-bg-sunken)] sm:flex-row sm:items-center sm:justify-between"
      style={{ borderTop: first ? "none" : "1px solid var(--uz-border)" }}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {vacancy.title}
        </p>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
          {vacancy.organisationName}
          {place && ` · ${place}`}
        </p>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:shrink-0 sm:items-end">
        {vacancy.salary && (
          <span className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {vacancy.salary}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
            style={{
              background: vacancy.urgent ? "var(--uz-amber-100)" : "var(--uz-bg-sunken)",
              color: vacancy.urgent ? "var(--uz-amber-700)" : "var(--uz-text-muted)",
            }}
          >
            {vacancy.urgent
              ? pick(T.urgent, lang)
              : pick(EMPLOYMENT_LABELS[vacancy.employmentType], lang)}
          </span>
          {vacancy.publishedAt && (
            <span className="text-[12px]" style={{ color: "var(--uz-text-faint)" }}>
              {formatRelative(vacancy.publishedAt, now, lang)}
            </span>
          )}
        </div>
      </div>
    </Link>
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
      style={{ background: "#ffffff", border: "1px solid var(--uz-border)", color: "var(--uz-text)" }}
    >
      {label}
    </button>
  );
}

/** Matches the careers page's own section heading. */
function Kicker({ label }: { label: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
      <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
        {label}
      </span>
    </div>
  );
}
