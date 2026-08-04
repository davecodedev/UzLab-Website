"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import {
  CAREERS_PATH,
  FIELD_LABELS,
  FIELD_ORDER,
  candidateSearchParams,
  type Candidate,
  type CandidatePage,
  type CandidateQuery,
  type LaboratoryField,
} from "@/lib/careers";

/**
 * The specialist directory an employer searches.
 *
 * Names and contact details are absent from the payload entirely for a caller
 * who is not signed in — the API never selects them — so the signed-out view
 * shows what a candidate can do and where they are, and says how to see who
 * they are. That is a deliberate trade: the directory is worth browsing before
 * signing in, without putting people's contact details on the open web.
 */

const T = {
  heading: { ru: "СПЕЦИАЛИСТЫ", uz: "MUTAXASSISLAR", en: "SPECIALISTS" },
  search: {
    ru: "Специальность, навык или ключевое слово",
    uz: "Mutaxassislik, ko'nikma yoki kalit so'z",
    en: "Speciality, skill or keyword",
  },
  allRegions: { ru: "Все регионы", uz: "Barcha hududlar", en: "All regions" },
  allFields: { ru: "Все области", uz: "Barcha sohalar", en: "All fields" },
  count: { ru: "специалистов", uz: "ta mutaxassis", en: "specialists" },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
  empty: {
    ru: "Пока никто не разместил профиль",
    uz: "Hozircha hech kim profil joylashtirmagan",
    en: "Nobody has published a profile yet",
  },
  emptyBody: {
    ru: "Как только специалисты опубликуют профили, они появятся здесь.",
    uz: "Mutaxassislar profillarini e'lon qilishi bilan ular shu yerda paydo bo'ladi.",
    en: "As soon as specialists publish their profiles they will appear here.",
  },
  noMatch: {
    ru: "Никто не найден. Попробуйте изменить запрос или снять фильтры.",
    uz: "Hech kim topilmadi. So'rovni o'zgartiring yoki filtrlarni olib tashlang.",
    en: "Nobody found. Try a different search, or clear the filters.",
  },
  openToWork: { ru: "Открыт к предложениям", uz: "Takliflarga ochiq", en: "Open to offers" },
  notLooking: { ru: "Сейчас не ищет", uz: "Hozir qidirmayapti", en: "Not looking right now" },
  years: { ru: "лет опыта", uz: "yil tajriba", en: "years of experience" },
  cv: { ru: "Резюме", uz: "Rezyume", en: "CV" },
  hiddenName: { ru: "Специалист", uz: "Mutaxassis", en: "Specialist" },
  signInPrompt: {
    ru: "Войдите, чтобы увидеть имена и контакты специалистов.",
    uz: "Mutaxassislarning ismi va kontaktlarini ko'rish uchun tizimga kiring.",
    en: "Sign in to see specialists' names and contact details.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
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

export function CandidateDirectory() {
  const { lang } = useLang();
  const [query, setQuery] = useState<CandidateQuery>({ page: 1 });
  const [text, setText] = useState("");
  const [result, setResult] = useState<CandidatePage | null>(null);
  const [regions, setRegions] = useState<{ value: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery((q) => (q.q === text ? q : { ...q, q: text, page: 1 }));
    }, 300);
    return () => clearTimeout(handle);
  }, [text]);

  useEffect(() => {
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request starts here
    setLoading(true);
    api
      .get<CandidatePage>(
        `${CAREERS_PATH}/candidates${candidateSearchParams(query)}`,
        getAccessToken() ?? undefined,
      )
      .then((page) => current && setResult(page))
      .catch(
        () =>
          current &&
          setResult({ items: [], total: 0, page: 1, pageSize: 20, identified: false }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [query]);

  useEffect(() => {
    api
      .get<{ regions: { value: string; count: number }[] }>(
        `${CAREERS_PATH}/candidates/facets`,
      )
      .then((f) => setRegions(f.regions))
      .catch(() => setRegions([]));
  }, []);

  const total = result?.total ?? 0;
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const directoryIsEmpty = total === 0 && !query.q && !query.region && !query.field;

  return (
    <div className="mt-8">
      <Kicker label={pick(T.heading, lang)} />

      {result && !result.identified && total > 0 && (
        <p
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg px-4 py-2.5 text-[13px]"
          style={{ background: "var(--uz-blue-50)", color: "var(--uz-text)" }}
        >
          {pick(T.signInPrompt, lang)}
          <Link
            href="/login"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--uz-blue-600)" }}
          >
            {pick(T.signIn, lang)}
          </Link>
        </p>
      )}

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
          {regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.value} ({formatNumber(r.count, lang)})
            </option>
          ))}
        </select>
        <select
          value={query.field ?? ""}
          onChange={(e) =>
            setQuery((q) => ({ ...q, field: e.target.value as LaboratoryField | "", page: 1 }))
          }
          className={controlClass}
          style={controlStyle}
        >
          <option value="">{pick(T.allFields, lang)}</option>
          {FIELD_ORDER.map((field) => (
            <option key={field} value={field}>
              {pick(FIELD_LABELS[field], lang)}
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
          className="mt-3 space-y-3"
          style={{ opacity: loading ? 0.55 : 1, transition: "opacity 120ms" }}
        >
          {result?.items.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}

      {total === 0 && !loading && (
        <div
          className="mt-3 rounded-xl border bg-white px-6 py-10 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {pick(directoryIsEmpty ? T.empty : T.noMatch, lang)}
          </p>
          {directoryIsEmpty && (
            <p
              className="mx-auto mt-2 max-w-[52ch] text-[13px]"
              style={{ color: "var(--uz-text-muted)" }}
            >
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
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { lang } = useLang();
  const place = [candidate.city, candidate.region].filter(Boolean).join(", ");

  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--uz-border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {/* Absent rather than blank when the caller is not signed in. */}
            {candidate.fullName ?? pick(T.hiddenName, lang)}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--uz-text)" }}>
            {candidate.headline}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={
            candidate.openToWork
              ? { background: "var(--uz-success-bg)", color: "var(--uz-success-fg)" }
              : { background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }
          }
        >
          {pick(candidate.openToWork ? T.openToWork : T.notLooking, lang)}
        </span>
      </div>

      <p
        className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs"
        style={{ color: "var(--uz-text-faint)" }}
      >
        {place && <span>{place}</span>}
        {candidate.yearsExperience !== null && (
          <span>
            {formatNumber(candidate.yearsExperience, lang)} {pick(T.years, lang)}
          </span>
        )}
        {candidate.fields.map((field) => (
          <span key={field}>{pick(FIELD_LABELS[field], lang)}</span>
        ))}
      </p>

      <p
        className="mt-2 whitespace-pre-line text-[13px] leading-relaxed"
        style={{ color: "var(--uz-text-muted)" }}
      >
        {candidate.summary}
      </p>

      {candidate.skills.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full px-2.5 py-0.5 text-[11px]"
              style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" }}
            >
              {skill}
            </span>
          ))}
        </p>
      )}

      {(candidate.contactEmail || candidate.cvUrl) && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {candidate.contactEmail && (
            <a
              href={`mailto:${candidate.contactEmail}`}
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--uz-blue-600)" }}
            >
              {candidate.contactEmail}
            </a>
          )}
          {candidate.contactPhone && (
            <span style={{ color: "var(--uz-text-muted)" }}>{candidate.contactPhone}</span>
          )}
          {candidate.cvUrl && (
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--uz-blue-600)" }}
            >
              {pick(T.cv, lang)}
            </a>
          )}
        </p>
      )}
    </div>
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
