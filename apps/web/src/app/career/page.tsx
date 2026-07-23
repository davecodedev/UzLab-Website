"use client";

import Link from "next/link";
import { useState } from "react";

type Track = "seeker" | "employer";

const CITIES = ["Ташкент", "Самарканд", "Бухара", "Наманган"];

function BriefcaseIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--uz-blue-600)" : "var(--uz-text-faint)"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
      <path d="M10.5 12.5h3v1.5h-3z" />
    </svg>
  );
}

function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--uz-blue-600)" : "var(--uz-text-faint)"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="3.5" width="10" height="17" rx="1" />
      <rect x="14.5" y="9.5" width="5" height="11" rx="1" />
      <path d="M7.5 7h1M11.5 7h1M7.5 10.5h1M11.5 10.5h1M7.5 14h1M11.5 14h1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--uz-text-faint)" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.2M16 3v3.2" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12.5 6.5 5h11L20 12.5" />
      <path d="M4 12.5v5.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.5" />
      <path d="M4 12.5h4.8a2 2 0 0 1 1.9 1.4l.2.7a2 2 0 0 0 1.9 1.4h.4a2 2 0 0 0 1.9-1.4l.2-.7a2 2 0 0 1 1.9-1.4H20" />
    </svg>
  );
}

function EmptyPanel({
  heading,
  description,
  icon,
}: {
  heading: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-white px-6 py-14 text-center"
      style={{ borderColor: "var(--uz-border-strong)" }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
      >
        {icon ?? <DocIcon />}
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

function SeekerTrack() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);

  return (
    <div className="mt-8">
      <Kicker label="ОТКРЫТЫЕ ВАКАНСИИ" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="flex flex-1 items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Должность, ключевые слова..."
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--uz-text)" }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CITIES.map((c) => {
          const active = city === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCity(active ? null : c)}
              className="rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                borderColor: active ? "var(--uz-blue-600)" : "var(--uz-border)",
                background: active ? "var(--uz-blue-50)" : "#ffffff",
                color: active ? "var(--uz-blue-700)" : "var(--uz-text-muted)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <EmptyPanel
          icon={<BriefcaseIcon active={false} />}
          heading="Вакансии ещё не опубликованы"
          description="Как только лаборатории начнут размещать открытые позиции, они появятся здесь с фильтрами по городу и специализации."
        />
      </div>
    </div>
  );
}

function EmployerTrack() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div>
        <Kicker label="РАЗМЕСТИТЬ ВАКАНСИЮ" />
        <div
          className="rounded-xl border bg-white p-6"
          style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                Название должности
              </label>
              <input
                disabled
                placeholder="Например, инженер-метролог"
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                  Город
                </label>
                <input
                  disabled
                  placeholder="Город"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                  Зарплата
                </label>
                <input
                  disabled
                  placeholder="Диапазон"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                Описание вакансии
              </label>
              <textarea
                disabled
                rows={4}
                placeholder="Обязанности, требования, условия..."
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-md px-4 py-2.5 text-sm font-semibold"
              style={{ background: "var(--uz-border)", color: "var(--uz-text-faint)" }}
            >
              Опубликовать вакансию
            </button>
            <p className="text-center text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
              Публикация вакансий появится здесь на следующем этапе разработки.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <Kicker label="ВАШИ ВАКАНСИИ" />
          <EmptyPanel
            icon={<BriefcaseIcon active={false} />}
            heading="Вы ещё не разместили ни одной вакансии"
            description="Опубликованные вами позиции будут отображаться в этом списке."
          />
        </div>
        <div>
          <Kicker label="ЗАЯВКИ СОИСКАТЕЛЕЙ" />
          <EmptyPanel
            icon={<InboxIcon />}
            heading="Заявок пока нет"
            description="Отклики соискателей на ваши вакансии появятся здесь."
          />
        </div>
      </div>
    </div>
  );
}

export default function CareerPage() {
  const [track, setTrack] = useState<Track>("seeker");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          Главная
        </Link>
        <span>/</span>
        <span style={{ color: "var(--uz-text)" }}>Карьера</span>
      </nav>

      <h1
        className="text-[34px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Карьера в лабораториях
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        Открытые позиции в аккредитованных лабораториях и инструменты для работодателей — в одном месте.
      </p>

      {/* Two-tracks toggle */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            { id: "seeker" as Track, title: "Я ищу работу", subtitle: "Просмотр открытых вакансий" },
            { id: "employer" as Track, title: "Я работодатель", subtitle: "Публикация вакансий и заявки" },
          ]
        ).map((option) => {
          const active = track === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTrack(option.id)}
              className="flex items-center gap-3.5 rounded-xl bg-white px-5 py-4 text-left transition-colors"
              style={{
                border: `2px solid ${active ? "var(--uz-blue-600)" : "var(--uz-border)"}`,
                boxShadow: active ? "var(--uz-shadow-sm)" : "none",
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: active ? "var(--uz-blue-50)" : "var(--uz-bg-sunken)" }}
              >
                {option.id === "seeker" ? <BriefcaseIcon active={active} /> : <BuildingIcon active={active} />}
              </span>
              <span>
                <span
                  className="block text-[15px] font-bold"
                  style={{ color: active ? "var(--uz-navy-900)" : "var(--uz-text)" }}
                >
                  {option.title}
                </span>
                <span className="block text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
                  {option.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {track === "seeker" ? <SeekerTrack /> : <EmployerTrack />}
    </div>
  );
}
