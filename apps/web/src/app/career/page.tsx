"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang, pick, type Lang } from "@/lib/i18n";

type Track = "seeker" | "employer";

type CityId = "tashkent" | "bukhara" | "fergana" | "chirchiq";

type L10n = Record<Lang, string>;

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  breadcrumbCurrent: { ru: "Карьера", uz: "Karyera", en: "Career" },
  pageTitle: {
    ru: "Карьера в лабораториях",
    uz: "Laboratoriyalarda karyera",
    en: "Careers in laboratories",
  },
  pageSubtitle: {
    ru: "Открытые позиции в аккредитованных лабораториях и инструменты для работодателей — в одном месте.",
    uz: "Akkreditatsiyadan o'tgan laboratoriyalardagi ochiq lavozimlar va ish beruvchilar uchun vositalar — bir joyda.",
    en: "Open positions at accredited laboratories and tools for employers — all in one place.",
  },
  seekerTitle: { ru: "Я ищу работу", uz: "Men ish qidiryapman", en: "I'm looking for a job" },
  seekerSubtitle: {
    ru: "Просмотр открытых вакансий",
    uz: "Ochiq vakansiyalarni ko'rish",
    en: "Browse open vacancies",
  },
  employerTitle: { ru: "Я работодатель", uz: "Men ish beruvchiman", en: "I'm an employer" },
  employerSubtitle: {
    ru: "Публикация вакансий и заявки",
    uz: "Vakansiya e'lon qilish va arizalar",
    en: "Post vacancies and review applications",
  },

  openVacancies: { ru: "ОТКРЫТЫЕ ВАКАНСИИ", uz: "OCHIQ VAKANSIYALAR", en: "OPEN VACANCIES" },
  searchPlaceholder: {
    ru: "Должность, ключевые слова...",
    uz: "Lavozim, kalit so'zlar...",
    en: "Job title, keywords...",
  },
  vacancyCount: { ru: "вакансий", uz: "ta vakansiya", en: "vacancies" },
  noResultsHeading: {
    ru: "По вашему запросу ничего не найдено",
    uz: "So'rovingiz bo'yicha hech narsa topilmadi",
    en: "Nothing matches your search",
  },
  noResultsDescription: {
    ru: "Попробуйте изменить город или ключевые слова поиска.",
    uz: "Shaharni yoki qidiruv kalit so'zlarini o'zgartirib ko'ring.",
    en: "Try changing the city or your search keywords.",
  },

  postVacancy: { ru: "РАЗМЕСТИТЬ ВАКАНСИЮ", uz: "VAKANSIYA JOYLASHTIRISH", en: "POST A VACANCY" },
  fieldJobTitle: { ru: "Название должности", uz: "Lavozim nomi", en: "Job title" },
  fieldJobTitlePlaceholder: {
    ru: "Например, инженер-метролог",
    uz: "Masalan, muhandis-metrolog",
    en: "For example, metrology engineer",
  },
  fieldCity: { ru: "Город", uz: "Shahar", en: "City" },
  fieldCityPlaceholder: { ru: "Город", uz: "Shahar", en: "City" },
  fieldSalary: { ru: "Зарплата", uz: "Maosh", en: "Salary" },
  fieldSalaryPlaceholder: { ru: "Диапазон", uz: "Oraliq", en: "Range" },
  fieldDescription: { ru: "Описание вакансии", uz: "Vakansiya tavsifi", en: "Job description" },
  fieldDescriptionPlaceholder: {
    ru: "Обязанности, требования, условия...",
    uz: "Vazifalar, talablar, shartlar...",
    en: "Responsibilities, requirements, conditions...",
  },
  publishButton: { ru: "Опубликовать вакансию", uz: "Vakansiyani e'lon qilish", en: "Publish vacancy" },
  publishNote: {
    ru: "Публикация вакансий появится здесь на следующем этапе разработки.",
    uz: "Vakansiya e'lon qilish imkoniyati ishlab chiqishning keyingi bosqichida shu yerda paydo bo'ladi.",
    en: "Vacancy publishing will appear here in the next development phase.",
  },
  yourVacancies: { ru: "ВАШИ ВАКАНСИИ", uz: "SIZNING VAKANSIYALARINGIZ", en: "YOUR VACANCIES" },
  noVacanciesHeading: {
    ru: "Вы ещё не разместили ни одной вакансии",
    uz: "Siz hali birorta vakansiya joylashtirmagansiz",
    en: "You haven't posted any vacancies yet",
  },
  noVacanciesDescription: {
    ru: "Опубликованные вами позиции будут отображаться в этом списке.",
    uz: "Siz e'lon qilgan lavozimlar shu ro'yxatda ko'rinadi.",
    en: "Positions you publish will appear in this list.",
  },
  applications: { ru: "ЗАЯВКИ СОИСКАТЕЛЕЙ", uz: "NOMZODLAR ARIZALARI", en: "CANDIDATE APPLICATIONS" },
  noApplicationsHeading: {
    ru: "Заявок пока нет",
    uz: "Hozircha arizalar yo'q",
    en: "No applications yet",
  },
  noApplicationsDescription: {
    ru: "Отклики соискателей на ваши вакансии появятся здесь.",
    uz: "Nomzodlarning vakansiyalaringizga javoblari shu yerda ko'rinadi.",
    en: "Candidate responses to your vacancies will appear here.",
  },
};

const CITIES: { id: CityId; label: L10n }[] = [
  { id: "tashkent", label: { ru: "Ташкент", uz: "Toshkent", en: "Tashkent" } },
  { id: "bukhara", label: { ru: "Бухара", uz: "Buxoro", en: "Bukhara" } },
  { id: "fergana", label: { ru: "Фергана", uz: "Farg'ona", en: "Fergana" } },
  { id: "chirchiq", label: { ru: "Чирчик", uz: "Chirchiq", en: "Chirchiq" } },
];

type Job = {
  id: string;
  title: L10n;
  org: L10n;
  city: CityId;
  salary: L10n;
  tag: L10n;
  urgent: boolean;
  posted: L10n;
};

const JOBS: Job[] = [
  {
    id: "chemist-water",
    title: {
      ru: "Инженер-химик, лаборатория питьевой воды",
      uz: "Muhandis-kimyogar, ichimlik suvi laboratoriyasi",
      en: "Chemical engineer, drinking-water laboratory",
    },
    org: {
      ru: "Тошкент сув таъминоти",
      uz: "Toshkent suv ta'minoti",
      en: "Toshkent suv ta'minoti",
    },
    city: "tashkent",
    salary: { ru: "от 8,0 млн", uz: "8,0 mln so'mdan", en: "from 8.0M UZS" },
    tag: { ru: "Полная занятость", uz: "To'liq bandlik", en: "Full-time" },
    urgent: false,
    posted: { ru: "2 дня назад", uz: "2 kun oldin", en: "2 days ago" },
  },
  {
    id: "microbiology-technician",
    title: {
      ru: "Лаборант микробиологического отдела",
      uz: "Mikrobiologiya bo'limi laboranti",
      en: "Microbiology department technician",
    },
    org: {
      ru: "ИЦ «Стандарт-Сервис»",
      uz: "«Standart-Servis» sinov markazi",
      en: "Standart-Servis Testing Centre",
    },
    city: "tashkent",
    salary: { ru: "от 5,5 млн", uz: "5,5 mln so'mdan", en: "from 5.5M UZS" },
    tag: { ru: "Срочно", uz: "Shoshilinch", en: "Urgent" },
    urgent: true,
    posted: { ru: "4 дня назад", uz: "4 kun oldin", en: "4 days ago" },
  },
  {
    id: "metrologist-calibration",
    title: {
      ru: "Метролог по калибровке средств измерений",
      uz: "O'lchash vositalarini kalibrlash bo'yicha metrolog",
      en: "Metrologist for calibration of measuring instruments",
    },
    org: {
      ru: "Республиканский центр метрологии",
      uz: "Respublika metrologiya markazi",
      en: "Republican Centre of Metrology",
    },
    city: "bukhara",
    salary: { ru: "от 7,0 млн", uz: "7,0 mln so'mdan", en: "from 7.0M UZS" },
    tag: { ru: "Полная занятость", uz: "To'liq bandlik", en: "Full-time" },
    urgent: false,
    posted: { ru: "неделю назад", uz: "bir hafta oldin", en: "a week ago" },
  },
  {
    id: "head-of-lab",
    title: {
      ru: "Начальник испытательной лаборатории",
      uz: "Sinov laboratoriyasi boshlig'i",
      en: "Head of testing laboratory",
    },
    org: { ru: "Агросифат", uz: "Agrosifat", en: "Agrosifat" },
    city: "fergana",
    salary: { ru: "от 12,0 млн", uz: "12,0 mln so'mdan", en: "from 12.0M UZS" },
    tag: { ru: "Руководитель", uz: "Rahbar", en: "Management" },
    urgent: true,
    posted: { ru: "неделю назад", uz: "bir hafta oldin", en: "a week ago" },
  },
  {
    id: "quality-specialist",
    title: {
      ru: "Специалист по качеству (ISO/IEC 17025)",
      uz: "Sifat bo'yicha mutaxassis (ISO/IEC 17025)",
      en: "Quality specialist (ISO/IEC 17025)",
    },
    org: { ru: "Узкимёсаноат", uz: "O'zkimyosanoat", en: "O'zkimyosanoat" },
    city: "chirchiq",
    salary: { ru: "договорная", uz: "kelishilgan holda", en: "negotiable" },
    tag: { ru: "Полная занятость", uz: "To'liq bandlik", en: "Full-time" },
    urgent: false,
    posted: { ru: "2 недели назад", uz: "2 hafta oldin", en: "2 weeks ago" },
  },
];

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
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<CityId | null>(null);

  const filtered = JOBS.filter((job) => {
    const matchesCity = !city || job.city === city;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      pick(job.title, lang).toLowerCase().includes(needle) ||
      pick(job.org, lang).toLowerCase().includes(needle);
    return matchesCity && matchesQuery;
  });

  return (
    <div className="mt-8">
      <Kicker label={t("openVacancies")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="flex flex-1 items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--uz-text)" }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CITIES.map((c) => {
          const active = city === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCity(active ? null : c.id)}
              className="rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                borderColor: active ? "var(--uz-blue-600)" : "var(--uz-border)",
                background: active ? "var(--uz-blue-50)" : "#ffffff",
                color: active ? "var(--uz-blue-700)" : "var(--uz-text-muted)",
              }}
            >
              {pick(c.label, lang)}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[13px] font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {filtered.length} {t("vacancyCount")}
      </p>

      {filtered.length > 0 ? (
        <div
          className="mt-3 overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: "var(--uz-border)" }}
        >
          {filtered.map((job, idx) => {
            const cityLabel = CITIES.find((c) => c.id === job.city);
            return (
              <Link
                key={job.id}
                href="/contact"
                className="flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-[var(--uz-bg-sunken)] sm:flex-row sm:items-center sm:justify-between"
                style={{ borderTop: idx === 0 ? "none" : "1px solid var(--uz-border)" }}
              >
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
                    {pick(job.title, lang)}
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
                    {pick(job.org, lang)} · {cityLabel ? pick(cityLabel.label, lang) : job.city}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1.5 sm:items-end sm:shrink-0">
                  <span className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
                    {pick(job.salary, lang)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                      style={{
                        background: job.urgent ? "var(--uz-amber-100)" : "var(--uz-bg-sunken)",
                        color: job.urgent ? "var(--uz-amber-700)" : "var(--uz-text-muted)",
                      }}
                    >
                      {pick(job.tag, lang)}
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--uz-text-faint)" }}>
                      {pick(job.posted, lang)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyPanel
            icon={<BriefcaseIcon active={false} />}
            heading={t("noResultsHeading")}
            description={t("noResultsDescription")}
          />
        </div>
      )}
    </div>
  );
}

function EmployerTrack() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div>
        <Kicker label={t("postVacancy")} />
        <div
          className="rounded-xl border bg-white p-6"
          style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                {t("fieldJobTitle")}
              </label>
              <input
                disabled
                placeholder={t("fieldJobTitlePlaceholder")}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                  {t("fieldCity")}
                </label>
                <input
                  disabled
                  placeholder={t("fieldCityPlaceholder")}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                  {t("fieldSalary")}
                </label>
                <input
                  disabled
                  placeholder={t("fieldSalaryPlaceholder")}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--uz-border)", background: "var(--uz-bg-sunken)", color: "var(--uz-text-faint)" }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                {t("fieldDescription")}
              </label>
              <textarea
                disabled
                rows={4}
                placeholder={t("fieldDescriptionPlaceholder")}
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
              {t("publishButton")}
            </button>
            <p className="text-center text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
              {t("publishNote")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <Kicker label={t("yourVacancies")} />
          <EmptyPanel
            icon={<BriefcaseIcon active={false} />}
            heading={t("noVacanciesHeading")}
            description={t("noVacanciesDescription")}
          />
        </div>
        <div>
          <Kicker label={t("applications")} />
          <EmptyPanel
            icon={<InboxIcon />}
            heading={t("noApplicationsHeading")}
            description={t("noApplicationsDescription")}
          />
        </div>
      </div>
    </div>
  );
}

export default function CareerPage() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);
  const [track, setTrack] = useState<Track>("seeker");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          {t("breadcrumbHome")}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--uz-text)" }}>{t("breadcrumbCurrent")}</span>
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

      {/* Two-tracks toggle */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            { id: "seeker" as Track, title: t("seekerTitle"), subtitle: t("seekerSubtitle") },
            { id: "employer" as Track, title: t("employerTitle"), subtitle: t("employerSubtitle") },
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
