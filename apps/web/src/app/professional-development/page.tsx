"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang, pick } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import {
  COURSES,
  FLAT_PRICE,
  PROVIDER,
  STANDARD_PRICES,
  priceFor,
  type Course,
} from "@/lib/training";

type TabId = "courses" | "prices";

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  pageTitle: {
    ru: "Профессиональное развитие",
    uz: "Kasbiy rivojlanish",
    en: "Professional development",
  },
  pageSubtitle: {
    ru: "Курсы повышения квалификации для персонала лабораторий, органов по сертификации и инспекции.",
    uz: "Laboratoriyalar, sertifikatlashtirish va inspeksiya organlari xodimlari uchun malaka oshirish kurslari.",
    en: "Professional development courses for the staff of laboratories, certification bodies and inspection bodies.",
  },
  tabCourses: { ru: "Курсы", uz: "Kurslar", en: "Courses" },
  tabPrices: { ru: "Стоимость", uz: "Narxi", en: "Prices" },

  courseCount: { ru: "курсов в программе", uz: "ta kurs dasturda", en: "courses in the programme" },
  duration: { ru: "Продолжительность", uz: "Davomiyligi", en: "Duration" },
  days: { ru: "дн.", uz: "kun", en: "days" },
  perPerson: { ru: "на одного слушателя", uz: "bir tinglovchi uchun", en: "per participant" },
  byMethod: {
    ru: "Согласно методу испытаний",
    uz: "Sinov usuliga muvofiq",
    en: "According to the test method",
  },

  priceTableTitle: {
    ru: "Стоимость курсов повышения квалификации",
    uz: "Malaka oshirish kurslarining narxi",
    en: "Cost of the professional development courses",
  },
  colDuration: { ru: "Продолжительность курса", uz: "Kurs davomiyligi", en: "Course duration" },
  colPrice: {
    ru: "Стоимость на одного слушателя, сум",
    uz: "Bir tinglovchi uchun narxi, so'm",
    en: "Cost per participant, UZS",
  },
  colNote: { ru: "Примечание", uz: "Izoh", en: "Note" },
  noteStandard: {
    ru: "Для курсов кроме №№ 4 и 5",
    uz: "4 va 5-sonli kurslardan tashqari kurslar uchun",
    en: "For all courses except nos. 4 and 5",
  },
  noteFlat: {
    ru: "Для курсов №№ 4 и 5",
    uz: "4 va 5-sonli kurslar uchun",
    en: "For courses nos. 4 and 5",
  },
  noteByMethod: {
    ru: "Согласно методу испытаний, для курса № 12",
    uz: "Sinov usuliga muvofiq, 12-sonli kurs uchun",
    en: "According to the test method, for course no. 12",
  },

  disclaimerTravel: {
    ru: "Цены указаны без учёта командировочных расходов.",
    uz: "Narxlar komandirovka xarajatlarisiz ko'rsatilgan.",
    en: "Prices do not include travel expenses.",
  },
  disclaimerCustom: {
    ru: "Могут быть организованы и другие курсы по тематике заказчика.",
    uz: "Buyurtmachi mavzusi bo'yicha boshqa kurslar ham tashkil etilishi mumkin.",
    en: "Other courses can be arranged on the customer's own subjects.",
  },

  providerHeading: { ru: "Курсы проводит", uz: "Kurslarni o'tkazadi", en: "Courses are run by" },
  enquire: { ru: "Оставить заявку", uz: "Ariza qoldirish", en: "Make an enquiry" },
} as const;

export default function ProfessionalDevelopmentPage() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);
  const [tab, setTab] = useState<TabId>("courses");

  const tabs: { id: TabId; label: string }[] = [
    { id: "courses", label: t("tabCourses") },
    { id: "prices", label: t("tabPrices") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <nav
        className="mb-5 flex items-center gap-1.5 text-[13px]"
        style={{ color: "var(--uz-text-faint)" }}
      >
        <Link href="/" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          {t("breadcrumbHome")}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--uz-text)" }}>{t("pageTitle")}</span>
      </nav>

      <h1
        className="text-[34px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {t("pageTitle")}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        {t("pageSubtitle")}
      </p>

      <div
        className="mt-8 flex items-center gap-7 border-b"
        style={{ borderColor: "var(--uz-border)" }}
      >
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="relative pb-3 text-sm font-semibold transition-colors"
              style={{ color: active ? "var(--uz-navy-900)" : "var(--uz-text-muted)" }}
            >
              {item.label}
              {active && (
                <span
                  className="uz-slash absolute bottom-[-1px] left-0 h-[3px] w-full"
                  style={{ background: "var(--uz-blue-600)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === "courses" ? <CoursesPanel /> : <PricesPanel />}

      <ProviderCard />
    </div>
  );
}

function CoursesPanel() {
  const { lang } = useLang();

  return (
    <>
      <p className="mt-6 text-[13px] font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {formatNumber(COURSES.length, lang)} {pick(T.courseCount, lang)}
      </p>

      <div
        className="mt-3 overflow-hidden rounded-xl border bg-white"
        style={{ borderColor: "var(--uz-border)" }}
      >
        {COURSES.map((course, index) => (
          <CourseRow key={course.n} course={course} first={index === 0} />
        ))}
      </div>

      <Disclaimers />
    </>
  );
}

function CourseRow({ course, first }: { course: Course; first: boolean }) {
  const { lang } = useLang();

  // Course 12 is quoted as a span rather than as a list of every option.
  const durationLabel =
    course.pricing === "byMethod"
      ? `${course.durations[0]}–${course.durations[course.durations.length - 1]}`
      : course.durations.join(", ");

  const prices = course.durations
    .map((days) => priceFor(course, days))
    .filter((value): value is number => value !== null);
  // A flat-priced course costs the same whichever duration is taken, so one
  // figure is the honest presentation rather than the same number repeated.
  const distinct = [...new Set(prices)];

  return (
    <div
      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
      style={first ? undefined : { borderTop: "1px solid var(--uz-border)" }}
    >
      <div className="flex min-w-0 gap-3">
        <span
          className="mt-0.5 shrink-0 text-[13px] font-bold tabular-nums"
          style={{ color: "var(--uz-text-faint)" }}
        >
          {course.n}
        </span>
        <div className="min-w-0">
          <p
            className="text-[15px] leading-snug font-semibold"
            style={{ color: "var(--uz-navy-900)" }}
          >
            {pick(course.title, lang)}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.duration, lang)}: {durationLabel} {pick(T.days, lang)}
          </p>
        </div>
      </div>

      <div className="shrink-0 sm:pl-4 sm:text-right">
        {distinct.length ? (
          <>
            <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
              {distinct.map((value) => formatNumber(value, lang)).join(" / ")}
            </p>
            <p className="text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {pick(T.perPerson, lang)}
            </p>
          </>
        ) : (
          <p className="text-[13px] font-medium" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.byMethod, lang)}
          </p>
        )}
      </div>
    </div>
  );
}

function PricesPanel() {
  const { lang } = useLang();

  const rows = [
    ...Object.entries(STANDARD_PRICES).map(([days, price]) => ({
      key: `std-${days}`,
      duration: `${days} ${pick(T.days, lang)}`,
      price: formatNumber(price, lang),
      note: pick(T.noteStandard, lang),
    })),
    {
      key: "flat-6",
      duration: `6 ${pick(T.days, lang)}`,
      price: formatNumber(FLAT_PRICE, lang),
      note: pick(T.noteFlat, lang),
    },
    {
      key: "flat-5",
      duration: `5 ${pick(T.days, lang)}`,
      price: formatNumber(FLAT_PRICE, lang),
      note: pick(T.noteFlat, lang),
    },
    {
      key: "by-method",
      duration: `2–5 ${pick(T.days, lang)}`,
      price: "—",
      note: pick(T.noteByMethod, lang),
    },
  ];

  const th = "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider";
  const td = "px-4 py-3 align-top text-sm";

  return (
    <>
      <h2 className="mt-6 text-lg font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {pick(T.priceTableTitle, lang)}
      </h2>

      <div
        className="mt-3 overflow-x-auto rounded-xl border bg-white"
        style={{ borderColor: "var(--uz-border)" }}
      >
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}>
              <th className={th}>{pick(T.colDuration, lang)}</th>
              <th className={th}>{pick(T.colPrice, lang)}</th>
              <th className={th}>{pick(T.colNote, lang)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} style={index === 0 ? undefined : { borderTop: "1px solid var(--uz-border)" }}>
                <td className={td} style={{ color: "var(--uz-text)" }}>
                  {row.duration}
                </td>
                <td
                  className={`${td} font-bold tabular-nums`}
                  style={{ color: "var(--uz-navy-900)" }}
                >
                  {row.price}
                </td>
                <td className={td} style={{ color: "var(--uz-text-muted)" }}>
                  {row.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Disclaimers />
    </>
  );
}

function Disclaimers() {
  const { lang } = useLang();
  return (
    <section
      className="mt-6 flex gap-3 rounded-md p-4 text-sm"
      style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" }}
    >
      <span
        className="uz-slash mt-0.5 h-auto w-[3px] shrink-0"
        style={{ background: "var(--uz-blue-600)" }}
      />
      <div>
        <p>{pick(T.disclaimerTravel, lang)}</p>
        <p className="mt-1">{pick(T.disclaimerCustom, lang)}</p>
      </div>
    </section>
  );
}

function ProviderCard() {
  const { lang } = useLang();

  return (
    <section
      className="mt-6 rounded-xl border bg-white px-6 py-5"
      style={{ borderColor: "var(--uz-border)" }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--uz-text-faint)" }}
      >
        {pick(T.providerHeading, lang)}
      </p>
      <p className="mt-1 text-[17px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {PROVIDER.name}
      </p>
      <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        {pick(PROVIDER.address, lang)}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <a
          href={`mailto:${PROVIDER.email}`}
          className="underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {PROVIDER.email}
        </a>
        <a
          href={`tel:${PROVIDER.phone.replace(/\s/g, "")}`}
          className="underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {PROVIDER.phone}
        </a>
        <a
          href={`https://${PROVIDER.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {PROVIDER.website}
        </a>
      </p>

      <Link
        href="/contact"
        className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "var(--uz-blue-600)" }}
      >
        {pick(T.enquire, lang)}
      </Link>
    </section>
  );
}
