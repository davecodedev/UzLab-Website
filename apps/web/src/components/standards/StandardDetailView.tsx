"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import { formatDateNumeric, formatNumber } from "@/lib/format";
import {
  REGISTER_LABELS,
  SOURCE_LANGUAGE_NAMES,
  STATUS_LABELS,
  sourceLanguageKey,
  statusTone,
  type Standard,
} from "@/lib/standards";

const T = {
  back: { ru: "← Каталог стандартов", uz: "← Standartlar katalogi", en: "← Standards catalogue" },
  about: { ru: "О документе", uz: "Hujjat haqida", en: "About this document" },
  scope: { ru: "Область применения", uz: "Qo'llanilish sohasi", en: "Scope" },
  source: { ru: "Источник", uz: "Manba", en: "Source" },
  status: { ru: "Состояние", uz: "Holati", en: "Status" },
  sourceWording: { ru: "Формулировка источника", uz: "Manba ifodasi", en: "Source's own wording" },
  ics: { ru: "Классификация (ICS)", uz: "Tasniflash (ICS)", en: "Classification (ICS)" },
  category: { ru: "Категория", uz: "Toifa", en: "Category" },
  language: { ru: "Язык", uz: "Til", en: "Language" },
  year: { ru: "Год", uz: "Yil", en: "Year" },
  pages: { ru: "Объём", uz: "Hajmi", en: "Length" },
  pagesUnit: { ru: "с.", uz: "bet", en: "pp." },
  price: { ru: "Цена", uz: "Narxi", en: "Price" },
  effectiveFrom: { ru: "Введён с", uz: "Kuchga kirgan", en: "In force from" },
  effectiveUntil: { ru: "Действителен до", uz: "Amal qiladi", en: "Valid until" },
  developer: { ru: "Разработчик", uz: "Ishlab chiquvchi", en: "Developer" },
  committee: { ru: "Технический комитет", uz: "Texnik qo'mita", en: "Technical committee" },
  states: { ru: "Присоединившиеся государства", uz: "Qo'shilgan davlatlar", en: "Adopting states" },
  official: { ru: "Открыть в каталоге-источнике ↗", uz: "Manba katalogida ochish ↗", en: "Open in the source catalogue ↗" },
  notSold: {
    ru: "UZSTI продаёт официальные копии; здесь показана только карточка документа.",
    uz: "UZSTI rasmiy nusxalarni sotadi; bu yerda faqat hujjat kartasi ko'rsatilgan.",
    en: "UZSTI sells the official copies; what is shown here is the catalogue entry only.",
  },
  supersededWarning: {
    ru: "Этот документ больше не действует. Проверьте в каталоге-источнике, чем он заменён, прежде чем ссылаться на него.",
    uz: "Bu hujjat endi amal qilmaydi. Unga havola qilishdan oldin manba katalogida nima bilan almashtirilganini tekshiring.",
    en: "This document is no longer in force. Check the source catalogue for what replaced it before citing it.",
  },
  // Says why the document's own words did not change with the toggle. The
  // catalogues publish each standard in one language only, so there is no
  // translated version to show — the alternative to saying so is a reader
  // concluding the language switch is broken.
  sourceLanguageNote: {
    ru: "Текст ниже — формулировка самого каталога. Документ опубликован только на одном языке, поэтому переключатель языка его не меняет.",
    uz: "Quyidagi matn — katalogning o'z ifodasi. Hujjat faqat bitta tilda chop etilgan, shuning uchun til almashtirgich uni o'zgartirmaydi.",
    en: "The text below is the catalogue's own wording. The document is published in one language only, so the language switch does not change it.",
  },
  openOriginal: {
    ru: "Открыть оригинал",
    uz: "Asl nusxani ochish",
    en: "Open the original",
  },
  detailPending: {
    ru: "Разработчик, технический комитет и область применения для этого документа ещё не загружены из каталога-источника.",
    uz: "Ushbu hujjat uchun ishlab chiquvchi, texnik qo'mita va qo'llanilish sohasi manba katalogidan hali yuklanmagan.",
    en: "The developer, technical committee and scope for this document have not been fetched from the source catalogue yet.",
  },
} as const;

type Row = [label: string, value: React.ReactNode];

export function StandardDetailView({ standard }: { standard: Standard }) {
  const { lang } = useLang();
  const tone = statusTone(standard.status);
  const stale = standard.status === "SUPERSEDED" || standard.status === "WITHDRAWN";

  // The language the document itself is written in. The catalogues publish each
  // standard once, in one language, so this text cannot follow the site's
  // toggle — the most honest thing available is to say which language it is.
  const sourceLanguage = sourceLanguageKey(standard.language);
  const sourceLanguageName = sourceLanguage
    ? pick(SOURCE_LANGUAGE_NAMES[sourceLanguage], lang)
    : null;
  const inAnotherLanguage = Boolean(sourceLanguage && sourceLanguage !== lang);
  /** For screen readers and hyphenation, which need the real language. */
  const sourceLanguageTag = sourceLanguage === "fr" ? "fr" : sourceLanguage;

  const rows: Row[] = [
    [pick(T.source, lang), pick(REGISTER_LABELS[standard.register], lang)],
    // The catalogue's own wording sits beside the mapped status: the mapping is
    // ours, the wording is theirs, and a reader deciding whether to rely on the
    // document should see both.
    [pick(T.sourceWording, lang), standard.statusLabel],
    [
      pick(T.ics, lang),
      standard.icsCode ? `${standard.icsCode}${standard.icsLabel ? ` — ${standard.icsLabel}` : ""}` : null,
    ],
    [pick(T.category, lang), standard.category],
    [pick(T.language, lang), standard.language],
    [pick(T.year, lang), standard.year],
    [
      pick(T.pages, lang),
      standard.pageCount ? `${formatNumber(standard.pageCount, lang)} ${pick(T.pagesUnit, lang)}` : null,
    ],
    [
      pick(T.price, lang),
      standard.priceUzs ? `${formatNumber(standard.priceUzs, lang)} UZS` : null,
    ],
    [pick(T.effectiveFrom, lang), formatDateNumeric(standard.effectiveFrom, lang)],
    [pick(T.effectiveUntil, lang), formatDateNumeric(standard.effectiveUntil, lang)],
    [pick(T.developer, lang), standard.developer],
    [pick(T.committee, lang), standard.technicalCommittee],
    [
      pick(T.states, lang),
      standard.adoptingStates.length ? standard.adoptingStates.join(", ") : null,
    ],
  ];

  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <article className="mx-auto max-w-[900px] px-6 py-10 md:px-8">
      <Link href="/standards" className="text-sm font-semibold" style={{ color: "var(--uz-blue-600)" }}>
        {pick(T.back, lang)}
      </Link>

      <h1
        className="mt-5 text-2xl font-extrabold md:text-3xl"
        style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-navy-900)" }}
      >
        {standard.designation}
      </h1>
      <p
        className="mt-2 text-base leading-relaxed"
        style={{ color: "var(--uz-text)" }}
        lang={sourceLanguageTag ?? undefined}
      >
        {standard.title}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {pick(STATUS_LABELS[standard.status], lang)}
        </span>
        <a
          href={standard.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(T.official, lang)}
        </a>
      </div>

      {stale && (
        <p
          className="mt-5 rounded-xl px-5 py-4 text-sm leading-relaxed"
          style={{
            background: "var(--uz-warning-bg)",
            border: "1px solid var(--uz-warning)",
            color: "var(--uz-text)",
          }}
        >
          {pick(T.supersededWarning, lang)}
        </p>
      )}

      <section className="mt-8">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
        >
          {pick(T.about, lang)}
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[220px_1fr]">
          {shown.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-sm" style={{ color: "var(--uz-text-faint)" }}>
                {label}
              </dt>
              <dd className="text-sm" style={{ color: "var(--uz-text)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {standard.abstract && (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
            >
              {pick(T.scope, lang)}
            </h2>
            {/* Marks the language of the text itself, right where a reader who
                switched the site language would otherwise be confused. */}
            {sourceLanguageName && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" }}
              >
                {sourceLanguageName}
              </span>
            )}
          </div>

          {/* Only when it differs: saying "this is in English" to a reader
              already reading English is noise. */}
          {inAnotherLanguage && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
              {pick(T.sourceLanguageNote, lang)}{" "}
              <a
                href={standard.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
                style={{ color: "var(--uz-blue-600)" }}
              >
                {pick(T.openOriginal, lang)} ↗
              </a>
            </p>
          )}

          <p
            className="mt-3 whitespace-pre-line text-sm leading-relaxed"
            style={{ color: "var(--uz-text)" }}
            lang={sourceLanguageTag ?? undefined}
          >
            {standard.abstract}
          </p>
        </section>
      )}

      {/* Says plainly that a field is missing because we have not fetched it
          yet, rather than leaving a reader to conclude the source has nothing. */}
      {standard.register === "MGS" && !standard.detailFetchedAt && (
        <p className="mt-8 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.detailPending, lang)}
        </p>
      )}
      {standard.register === "UZSTI" && (
        <p className="mt-8 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.notSold, lang)}
        </p>
      )}
    </article>
  );
}
