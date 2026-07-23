"use client";

import Link from "next/link";
import { useState } from "react";

type TabId = "courses" | "seminars";

const TABS: { id: TabId; label: string }[] = [
  { id: "courses", label: "Курсы" },
  { id: "seminars", label: "Семинары и практикумы" },
];

const PANEL_COPY: Record<TabId, { heading: string; description: string }> = {
  courses: {
    heading: "Курсы пока не опубликованы",
    description:
      "Как только программы обучения будут утверждены, они появятся здесь со сроками и условиями участия для членов ассоциации.",
  },
  seminars: {
    heading: "Семинары и практикумы пока не опубликованы",
    description:
      "Расписание семинаров и практических занятий появится в этой вкладке после подтверждения дат.",
  },
};

function EmptyPanel({ heading, description }: { heading: string; description: string }) {
  return (
    <div
      className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed bg-white px-6 py-14 text-center"
      style={{ borderColor: "var(--uz-border-strong)" }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17" />
          <path d="M8 3v3.2M16 3v3.2" />
        </svg>
      </span>
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--uz-navy-900)" }}>
        {heading}
      </h3>
      <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {description}
      </p>
    </div>
  );
}

export default function ProfessionalDevelopmentPage() {
  const [tab, setTab] = useState<TabId>("courses");
  const copy = PANEL_COPY[tab];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
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

      <EmptyPanel heading={copy.heading} description={copy.description} />

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
