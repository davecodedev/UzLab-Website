"use client";

import Link from "next/link";
import { useState } from "react";

type TabId = "courses" | "seminars";

const TABS: { id: TabId; label: string }[] = [
  { id: "courses", label: "Курсы" },
  { id: "seminars", label: "Семинары и практикумы" },
];

type StatusChip = {
  label: string;
  tone: "success" | "amber" | "neutral";
};

type Course = {
  duration: string;
  format: string;
  status: StatusChip;
  title: string;
  description: string;
  price: string;
  memberPrice: string;
  cta: string;
};

const COURSES: Course[] = [
  {
    duration: "Курс · 5 дней",
    format: "Очно · Ташкент",
    status: { label: "Набор открыт", tone: "success" },
    title: "Менеджер по качеству лаборатории: система менеджмента по ISO/IEC 17025",
    description:
      "Построение и поддержание СМК: документация, риски, внутренние аудиты, анализ со стороны руководства. Итоговая аттестация.",
    price: "3 600 000 сум",
    memberPrice: "членам — 2 880 000",
    cta: "Записаться →",
  },
  {
    duration: "Курс · 3 дня",
    format: "Онлайн",
    status: { label: "До 20 июля", tone: "amber" },
    title: "Внутренний аудитор испытательной лаборатории",
    description:
      "Планирование и проведение внутренних аудитов, оформление несоответствий, корректирующие действия. Практика на кейсах участников.",
    price: "1 900 000 сум",
    memberPrice: "членам — 1 520 000",
    cta: "Записаться →",
  },
  {
    duration: "Курс · 4 дня",
    format: "Очно · Ташкент",
    status: { label: "Набор открыт", tone: "success" },
    title: "Оценивание неопределённости измерений в количественном химическом анализе",
    description:
      "Бюджет неопределённости по GUM и EURACHEM/CITAC: от модели измерения до отчёта. Расчёты в электронных таблицах.",
    price: "2 800 000 сум",
    memberPrice: "членам — 2 240 000",
    cta: "Записаться →",
  },
  {
    duration: "Курс · 2 дня",
    format: "Онлайн",
    status: { label: "Старт в сентябре", tone: "neutral" },
    title: "Валидация и верификация методик испытаний",
    description:
      "Планирование эксперимента, критерии приемлемости, оформление протоколов валидации по требованиям аккредитации.",
    price: "1 400 000 сум",
    memberPrice: "членам — 1 120 000",
    cta: "В лист ожидания →",
  },
];

type Seminar = {
  date: string;
  title: string;
  location: string;
  status: StatusChip;
};

const SEMINARS: Seminar[] = [
  {
    date: "28 июл",
    title: "Внутренний аудит по ISO/IEC 17025:2017 — двухдневный семинар",
    location: "Ташкент",
    status: { label: "Осталось 4 места", tone: "amber" },
  },
  {
    date: "05 авг",
    title: "Неопределённость измерений: практикум с разбором рабочих примеров",
    location: "Онлайн",
    status: { label: "Набор открыт", tone: "success" },
  },
  {
    date: "19 авг",
    title: "Метрологическое обеспечение испытаний воды — выездной семинар",
    location: "Самарканд",
    status: { label: "Набор открыт", tone: "success" },
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
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={statusChipStyle(status.tone)}
    >
      {status.label}
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
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
            {course.duration}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-navy-800)" }}
          >
            {course.format}
          </span>
        </div>
        <StatusBadge status={course.status} />
      </div>

      <h3
        className="mt-4 text-[17px] font-bold leading-snug"
        style={{ color: "var(--uz-navy-900)" }}
      >
        {course.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {course.description}
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
            {course.price}
          </div>
          <div className="text-xs" style={{ color: "var(--uz-text-muted)" }}>
            {course.memberPrice}
          </div>
        </div>
        <Link
          href="/contact"
          className="text-sm font-semibold whitespace-nowrap"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {course.cta}
        </Link>
      </div>
    </div>
  );
}

function CoursesPanel() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      {COURSES.map((course) => (
        <CourseCard key={course.title} course={course} />
      ))}
    </div>
  );
}

function SeminarsPanel() {
  return (
    <div
      className="mt-6 overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: "var(--uz-border)" }}
    >
      {SEMINARS.map((seminar, index) => (
        <div
          key={seminar.title}
          className="flex flex-wrap items-center gap-4 px-6 py-5"
          style={index > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
        >
          <span
            className="shrink-0 rounded-md px-3 py-1.5 text-sm font-bold"
            style={{ background: "var(--uz-navy-900)", color: "#ffffff" }}
          >
            {seminar.date}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold" style={{ color: "var(--uz-navy-900)" }}>
              {seminar.title}
            </div>
            <div className="mt-0.5 text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {seminar.location}
            </div>
          </div>
          <StatusBadge status={seminar.status} />
        </div>
      ))}
    </div>
  );
}

export default function ProfessionalDevelopmentPage() {
  const [tab, setTab] = useState<TabId>("courses");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          Главная
        </Link>
        <span>/</span>
        <span style={{ color: "var(--uz-text)" }}>Профессиональное развитие</span>
      </nav>

      <h1
        className="text-[34px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Профессиональное развитие
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        Курсы и семинары для персонала лабораторий. Членам ассоциации — скидки или бесплатное участие.
      </p>

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-7 border-b" style={{ borderColor: "var(--uz-border)" }}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative pb-3 text-sm font-semibold transition-colors"
              style={{ color: active ? "var(--uz-navy-900)" : "var(--uz-text-muted)" }}
            >
              {t.label}
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
        <p>
          Сертификация специалистов, экзамены и полный календарь событий появятся в этих же вкладках —
          структура страницы рассчитана на расширение без редизайна.
        </p>
      </section>
    </div>
  );
}
