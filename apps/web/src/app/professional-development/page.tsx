"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang, pick, type Lang } from "@/lib/i18n";

type TabId = "courses" | "seminars";

type L10n = Record<Lang, string>;

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  pageTitle: {
    ru: "Профессиональное развитие",
    uz: "Kasbiy rivojlanish",
    en: "Professional development",
  },
  pageSubtitle: {
    ru: "Курсы и семинары для персонала лабораторий. Членам ассоциации — скидки или бесплатное участие.",
    uz: "Laboratoriya xodimlari uchun kurslar va seminarlar. Assotsiatsiya a'zolariga chegirma yoki bepul ishtirok.",
    en: "Courses and seminars for laboratory staff. Association members get discounts or free participation.",
  },
  tabCourses: { ru: "Курсы", uz: "Kurslar", en: "Courses" },
  tabSeminars: {
    ru: "Семинары и практикумы",
    uz: "Seminarlar va amaliyotlar",
    en: "Seminars and workshops",
  },
  footnote: {
    ru: "Сертификация специалистов, экзамены и полный календарь событий появятся в этих же вкладках — структура страницы рассчитана на расширение без редизайна.",
    uz: "Mutaxassislarni sertifikatlash, imtihonlar va tadbirlarning to'liq taqvimi shu tablarda paydo bo'ladi — sahifa tuzilishi qayta dizaynsiz kengayishga mo'ljallangan.",
    en: "Specialist certification, examinations and the full event calendar will appear in these same tabs — the page structure is designed to expand without a redesign.",
  },
};

type StatusChip = {
  label: L10n;
  tone: "success" | "amber" | "neutral";
};

const STATUS_OPEN: L10n = { ru: "Набор открыт", uz: "Qabul ochiq", en: "Enrolling now" };

type Course = {
  id: string;
  duration: L10n;
  format: L10n;
  status: StatusChip;
  title: L10n;
  description: L10n;
  price: L10n;
  memberPrice: L10n;
  cta: L10n;
};

const CTA_ENROL: L10n = { ru: "Записаться →", uz: "Ro'yxatdan o'tish →", en: "Enrol →" };

const COURSES: Course[] = [
  {
    id: "quality-manager",
    duration: { ru: "Курс · 5 дней", uz: "Kurs · 5 kun", en: "Course · 5 days" },
    format: { ru: "Очно · Ташкент", uz: "Yuzma-yuz · Toshkent", en: "In person · Tashkent" },
    status: { label: STATUS_OPEN, tone: "success" },
    title: {
      ru: "Менеджер по качеству лаборатории: система менеджмента по ISO/IEC 17025",
      uz: "Laboratoriya sifat menejeri: ISO/IEC 17025 bo'yicha menejment tizimi",
      en: "Laboratory quality manager: management system to ISO/IEC 17025",
    },
    description: {
      ru: "Построение и поддержание СМК: документация, риски, внутренние аудиты, анализ со стороны руководства. Итоговая аттестация.",
      uz: "SMTni qurish va qo'llab-quvvatlash: hujjatlar, risklar, ichki auditlar, rahbariyat tomonidan tahlil. Yakuniy attestatsiya.",
      en: "Building and maintaining a QMS: documentation, risks, internal audits, management review. Final assessment.",
    },
    price: { ru: "3 600 000 сум", uz: "3 600 000 so'm", en: "3,600,000 UZS" },
    memberPrice: {
      ru: "членам — 2 880 000",
      uz: "a'zolarga — 2 880 000",
      en: "members — 2,880,000",
    },
    cta: CTA_ENROL,
  },
  {
    id: "internal-auditor",
    duration: { ru: "Курс · 3 дня", uz: "Kurs · 3 kun", en: "Course · 3 days" },
    format: { ru: "Онлайн", uz: "Onlayn", en: "Online" },
    status: {
      label: { ru: "До 20 июля", uz: "20-iyulgacha", en: "Until 20 July" },
      tone: "amber",
    },
    title: {
      ru: "Внутренний аудитор испытательной лаборатории",
      uz: "Sinov laboratoriyasining ichki auditori",
      en: "Internal auditor for a testing laboratory",
    },
    description: {
      ru: "Планирование и проведение внутренних аудитов, оформление несоответствий, корректирующие действия. Практика на кейсах участников.",
      uz: "Ichki auditlarni rejalashtirish va o'tkazish, nomuvofiqliklarni rasmiylashtirish, tuzatuvchi choralar. Ishtirokchilar keyslari asosida amaliyot.",
      en: "Planning and running internal audits, recording nonconformities, corrective actions. Practice on participants' own cases.",
    },
    price: { ru: "1 900 000 сум", uz: "1 900 000 so'm", en: "1,900,000 UZS" },
    memberPrice: {
      ru: "членам — 1 520 000",
      uz: "a'zolarga — 1 520 000",
      en: "members — 1,520,000",
    },
    cta: CTA_ENROL,
  },
  {
    id: "uncertainty",
    duration: { ru: "Курс · 4 дня", uz: "Kurs · 4 kun", en: "Course · 4 days" },
    format: { ru: "Очно · Ташкент", uz: "Yuzma-yuz · Toshkent", en: "In person · Tashkent" },
    status: { label: STATUS_OPEN, tone: "success" },
    title: {
      ru: "Оценивание неопределённости измерений в количественном химическом анализе",
      uz: "Miqdoriy kimyoviy tahlilda o'lchash noaniqligini baholash",
      en: "Estimating measurement uncertainty in quantitative chemical analysis",
    },
    description: {
      ru: "Бюджет неопределённости по GUM и EURACHEM/CITAC: от модели измерения до отчёта. Расчёты в электронных таблицах.",
      uz: "GUM va EURACHEM/CITAC bo'yicha noaniqlik byudjeti: o'lchash modelidan hisobotgacha. Elektron jadvallarda hisob-kitoblar.",
      en: "Uncertainty budgets per GUM and EURACHEM/CITAC: from the measurement model to the report. Calculations in spreadsheets.",
    },
    price: { ru: "2 800 000 сум", uz: "2 800 000 so'm", en: "2,800,000 UZS" },
    memberPrice: {
      ru: "членам — 2 240 000",
      uz: "a'zolarga — 2 240 000",
      en: "members — 2,240,000",
    },
    cta: CTA_ENROL,
  },
  {
    id: "validation",
    duration: { ru: "Курс · 2 дня", uz: "Kurs · 2 kun", en: "Course · 2 days" },
    format: { ru: "Онлайн", uz: "Onlayn", en: "Online" },
    status: {
      label: { ru: "Старт в сентябре", uz: "Sentabrda boshlanadi", en: "Starts in September" },
      tone: "neutral",
    },
    title: {
      ru: "Валидация и верификация методик испытаний",
      uz: "Sinov metodikalarini validatsiya va verifikatsiya qilish",
      en: "Validation and verification of test methods",
    },
    description: {
      ru: "Планирование эксперимента, критерии приемлемости, оформление протоколов валидации по требованиям аккредитации.",
      uz: "Tajribani rejalashtirish, qabul qilish mezonlari, akkreditatsiya talablariga muvofiq validatsiya bayonnomalarini rasmiylashtirish.",
      en: "Experiment planning, acceptance criteria, and writing validation reports to accreditation requirements.",
    },
    price: { ru: "1 400 000 сум", uz: "1 400 000 so'm", en: "1,400,000 UZS" },
    memberPrice: {
      ru: "членам — 1 120 000",
      uz: "a'zolarga — 1 120 000",
      en: "members — 1,120,000",
    },
    cta: {
      ru: "В лист ожидания →",
      uz: "Kutish ro'yxatiga →",
      en: "Join the waitlist →",
    },
  },
];

type Seminar = {
  id: string;
  date: L10n;
  title: L10n;
  location: L10n;
  status: StatusChip;
};

const SEMINARS: Seminar[] = [
  {
    id: "audit-17025",
    date: { ru: "28 июл", uz: "28 iyul", en: "28 Jul" },
    title: {
      ru: "Внутренний аудит по ISO/IEC 17025:2017 — двухдневный семинар",
      uz: "ISO/IEC 17025:2017 bo'yicha ichki audit — ikki kunlik seminar",
      en: "Internal auditing to ISO/IEC 17025:2017 — a two-day seminar",
    },
    location: { ru: "Ташкент", uz: "Toshkent", en: "Tashkent" },
    status: {
      label: { ru: "Осталось 4 места", uz: "4 ta joy qoldi", en: "4 places left" },
      tone: "amber",
    },
  },
  {
    id: "uncertainty-workshop",
    date: { ru: "05 авг", uz: "05 avg", en: "05 Aug" },
    title: {
      ru: "Неопределённость измерений: практикум с разбором рабочих примеров",
      uz: "O'lchash noaniqligi: ish misollarini tahlil qilish amaliyoti",
      en: "Measurement uncertainty: a workshop on real working examples",
    },
    location: { ru: "Онлайн", uz: "Onlayn", en: "Online" },
    status: { label: STATUS_OPEN, tone: "success" },
  },
  {
    id: "water-metrology",
    date: { ru: "19 авг", uz: "19 avg", en: "19 Aug" },
    title: {
      ru: "Метрологическое обеспечение испытаний воды — выездной семинар",
      uz: "Suv sinovlarini metrologik ta'minlash — sayyor seminar",
      en: "Metrological assurance of water testing — an off-site seminar",
    },
    location: { ru: "Самарканд", uz: "Samarqand", en: "Samarkand" },
    status: { label: STATUS_OPEN, tone: "success" },
  },
];

function statusChipStyle(tone: StatusChip["tone"]) {
  switch (tone) {
    case "success":
      return { background: "var(--uz-success-bg)", color: "var(--uz-success)" };
    case "amber":
      return { background: "var(--uz-amber-100)", color: "var(--uz-amber-700)" };
    case "neutral":
      return { background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" };
  }
}

function StatusBadge({ status }: { status: StatusChip }) {
  const { lang } = useLang();
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={statusChipStyle(status.tone)}
    >
      {pick(status.label, lang)}
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { lang } = useLang();
  return (
    <div
      className="flex flex-col rounded-xl border bg-white p-6"
      style={{ borderColor: "var(--uz-border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
          >
            {pick(course.duration, lang)}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-navy-800)" }}
          >
            {pick(course.format, lang)}
          </span>
        </div>
        <StatusBadge status={course.status} />
      </div>

      <h3
        className="mt-4 text-[17px] font-bold leading-snug"
        style={{ color: "var(--uz-navy-900)" }}
      >
        {pick(course.title, lang)}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {pick(course.description, lang)}
      </p>

      <div
        className="mt-5 flex items-end justify-between gap-3 border-t pt-4"
        style={{ borderColor: "var(--uz-border)" }}
      >
        <div>
          <div
            className="text-lg font-bold"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
          >
            {pick(course.price, lang)}
          </div>
          <div className="text-xs" style={{ color: "var(--uz-text-muted)" }}>
            {pick(course.memberPrice, lang)}
          </div>
        </div>
        <Link
          href="/contact"
          className="text-sm font-semibold whitespace-nowrap"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(course.cta, lang)}
        </Link>
      </div>
    </div>
  );
}

function CoursesPanel() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      {COURSES.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

function SeminarsPanel() {
  const { lang } = useLang();
  return (
    <div
      className="mt-6 overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: "var(--uz-border)" }}
    >
      {SEMINARS.map((seminar, index) => (
        <div
          key={seminar.id}
          className="flex flex-wrap items-center gap-4 px-6 py-5"
          style={index > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
        >
          <span
            className="shrink-0 rounded-md px-3 py-1.5 text-sm font-bold"
            style={{ background: "var(--uz-navy-900)", color: "#ffffff" }}
          >
            {pick(seminar.date, lang)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold" style={{ color: "var(--uz-navy-900)" }}>
              {pick(seminar.title, lang)}
            </div>
            <div className="mt-0.5 text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {pick(seminar.location, lang)}
            </div>
          </div>
          <StatusBadge status={seminar.status} />
        </div>
      ))}
    </div>
  );
}

export default function ProfessionalDevelopmentPage() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);
  const [tab, setTab] = useState<TabId>("courses");

  const tabs: { id: TabId; label: string }[] = [
    { id: "courses", label: t("tabCourses") },
    { id: "seminars", label: t("tabSeminars") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
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

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-7 border-b" style={{ borderColor: "var(--uz-border)" }}>
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

      {tab === "courses" ? <CoursesPanel /> : <SeminarsPanel />}

      <section
        className="mt-10 flex gap-3 rounded-md p-4 text-sm"
        style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" }}
      >
        <span className="uz-slash mt-0.5 h-auto w-[3px] shrink-0" style={{ background: "var(--uz-blue-600)" }} />
        <p>{t("footnote")}</p>
      </section>
    </div>
  );
}
