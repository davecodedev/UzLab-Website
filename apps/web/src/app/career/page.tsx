"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang, pick } from "@/lib/i18n";
import { SeekerTrack } from "@/components/careers/SeekerTrack";
import { EmployerTrack } from "@/components/careers/EmployerTrack";

type Track = "seeker" | "employer";

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
