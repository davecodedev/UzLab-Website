"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import { SearchBar } from "@/components/SearchBar";
import { EmptyStateSection } from "@/components/EmptyStateSection";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: string | null;
}

const T = {
  heroTitle: {
    ru: "Лабораторная практика Узбекистана — по международным стандартам",
    uz: "O'zbekiston laboratoriya amaliyoti — xalqaro standartlar asosida",
    en: "Uzbekistan's laboratory practice — to international standards",
  },
  heroSub: {
    ru: "Ассоциация лабораторий Узбекистана объединяет испытательные, калибровочные и исследовательские лаборатории: стандарты, обучение, международное сотрудничество.",
    uz: "O'zbekiston laboratoriyalari assotsiatsiyasi sinov, kalibrlash va tadqiqot laboratoriyalarini birlashtiradi: standartlar, o'qitish, xalqaro hamkorlik.",
    en: "The Association of Laboratories of Uzbekistan unites testing, calibration and research labs: standards, training, international cooperation.",
  },
  joinCta: { ru: "Подать заявку", uz: "Ariza topshirish", en: "Apply now" },
  browsePub: { ru: "Публикации", uz: "Nashrlar", en: "Publications" },
  p1t: { ru: "Вступить в ассоциацию", uz: "Assotsiatsiyaga a'zo bo'lish", en: "Join the association" },
  p1s: {
    ru: "Типы членства, взносы и онлайн-заявка для лабораторий и специалистов.",
    uz: "A'zolik turlari, badallar va laboratoriyalar uchun onlayn ariza.",
    en: "Membership types, fees and an online application for labs and specialists.",
  },
  p1a: { ru: "Членство", uz: "A'zolik", en: "Membership" },
  p2t: { ru: "Найти документ", uz: "Hujjat topish", en: "Find a document" },
  p2s: {
    ru: "Сборники методик, нормативные акты и международная литература в одной библиотеке.",
    uz: "Metodikalar to'plamlari, normativ hujjatlar va xalqaro adabiyot — bitta kutubxonada.",
    en: "Method collections, regulatory acts and international literature in one library.",
  },
  p2a: { ru: "Публикации", uz: "Nashrlar", en: "Publications" },
  p3t: { ru: "Повысить квалификацию", uz: "Malaka oshirish", en: "Upskill your team" },
  p3s: {
    ru: "Курсы, семинары и практикумы — очно в Ташкенте и онлайн.",
    uz: "Kurslar, seminarlar va amaliyotlar — Toshkentda va onlayn.",
    en: "Courses, seminars and workshops — in Tashkent and online.",
  },
  p3a: { ru: "Обучение", uz: "O'qitish", en: "Training" },
  p4t: { ru: "Работа в лабораториях", uz: "Laboratoriyada ish", en: "Work in labs" },
  p4s: {
    ru: "Вакансии для специалистов и размещение объявлений для работодателей.",
    uz: "Mutaxassislar uchun vakansiyalar va ish beruvchilar uchun e'lonlar.",
    en: "Openings for specialists and postings for employers.",
  },
  p4a: { ru: "Карьера", uz: "Karyera", en: "Career" },
  missionKicker: { ru: "МИССИЯ", uz: "MISSIYA", en: "MISSION" },
  missionTitle: {
    ru: "Развиваем лабораторное дело — вместе",
    uz: "Laboratoriya ishini birga rivojlantiramiz",
    en: "Advancing laboratory practice — together",
  },
  missionBody: {
    ru: "Ассоциация лабораторий Узбекистана (UzLAB) зарегистрирована в Минюсте 16 июля 2025 года (№2880628). За короткое время объединила 68 членов: лаборатории, научные институты, поставщиков оборудования и реактивов, а также специалистов отрасли.",
    uz: "O'zbekiston laboratoriyalari uyushmasi (UzLAB) 2025-yil 16-iyulda Adliya vazirligida ro'yxatdan o'tgan (№2880628). Qisqa vaqtda 68 a'zoni birlashtirdi: laboratoriyalar, ilmiy institutlar, uskuna va reaktiv yetkazib beruvchilar hamda soha mutaxassislari.",
    en: "The Association of Laboratories of Uzbekistan (UzLAB) was registered with the Ministry of Justice on 16 July 2025 (No. 2880628). In a short time it has united 68 members: laboratories, research institutes, equipment and reagent suppliers, and industry specialists.",
  },
  missionLink: { ru: "Об ассоциации", uz: "Assotsiatsiya haqida", en: "About the association" },
  f1: { ru: "членов ассоциации", uz: "a'zo", en: "association members" },
  f2: { ru: "год регистрации", uz: "ro'yxatdan o'tgan yil", en: "year registered" },
  f3: { ru: "отраслей экономики", uz: "iqtisodiyot tarmoqlari", en: "sectors of the economy" },
  f4: { ru: "покрытие по стране", uz: "butun mamlakat bo'ylab", en: "nationwide coverage" },
  s1: { ru: "Активных членов", uz: "Faol a'zolar", en: "Active members" },
  s2: { ru: "Отраслей экономики", uz: "Iqtisodiyot tarmoqlari", en: "Sectors of the economy" },
  s3: {
    ru: "Охват всей территории Узбекистана",
    uz: "Butun O'zbekiston hududini qamrab olish",
    en: "Coverage across all of Uzbekistan",
  },
  newsTitle: { ru: "Новости", uz: "Yangiliklar", en: "News" },
  allNews: { ru: "Все новости →", uz: "Barcha yangiliklar →", en: "All news →" },
  noNews: { ru: "Новостей пока нет.", uz: "Hozircha yangiliklar yo'q.", en: "No news published yet." },
  eventsTitle: { ru: "Ближайшие события", uz: "Yaqin tadbirlar", en: "Upcoming events" },
  noEvents: {
    ru: "Ближайших событий пока нет.",
    uz: "Yaqin tadbirlar hozircha yo'q.",
    en: "No upcoming events scheduled yet.",
  },
  joinTitle: { ru: "Ещё не член ассоциации?", uz: "Hali a'zo emasmisiz?", en: "Not a member yet?" },
  joinBody: {
    ru: "Доступ к библиотеке методик, скидки на обучение и место в директории лабораторий.",
    uz: "Metodikalar kutubxonasi, o'qitishga chegirmalar va laboratoriyalar direktoriyasida o'rin.",
    en: "Access to the methods library, training discounts and a listing in the lab directory.",
  },
} as const;

const CARD_ICONS: React.ReactNode[] = [
  <path key="p1" d="M14 3L24 8V14C24 19.5 19.8 23.6 14 25C8.2 23.6 4 19.5 4 14V8L14 3Z M10 14L13 17L18.5 11" />,
  <path
    key="p2"
    d="M5 24V6C5 4.9 5.9 4 7 4H19L23 8V24 M9 12H19M9 16H19M9 20H15"
  />,
  <path key="p3" d="M4 22C4 18 8 16 14 16C20 16 24 18 24 22V24H4V22Z M14 9m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />,
  <path key="p4" d="M4 9H24V24H4V9ZM10 9V6C10 4.9 10.9 4 12 4H16C17.1 4 18 4.9 18 6V9M4 15H24" />,
];

export function HomeView({ news }: { news: NewsArticle[] }) {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  const cards = [
    { href: "/membership", title: t("p1t"), sub: t("p1s"), action: t("p1a") },
    { href: "/publications", title: t("p2t"), sub: t("p2s"), action: t("p2a") },
    { href: "/professional-development", title: t("p3t"), sub: t("p3s"), action: t("p3a") },
    { href: "/career", title: t("p4t"), sub: t("p4s"), action: t("p4a") },
  ];

  const facts = [
    { value: "68", label: t("f1") },
    { value: "2025", label: t("f2") },
    { value: "9+", label: t("f3") },
    { value: "100%", label: t("f4") },
  ];

  return (
    <div>
      {/* HERO */}
      <div className="relative overflow-hidden" style={{ background: "var(--uz-navy-900)" }}>
        <span
          className="uz-slash pointer-events-none absolute -top-20 right-[14%] hidden w-[120px] sm:block"
          style={{ height: 520, background: "var(--uz-navy-800)" }}
        />
        <span
          className="uz-slash pointer-events-none absolute -top-20 right-[8%] hidden w-[34px] sm:block"
          style={{ height: 520, background: "var(--uz-blue-600)", opacity: 0.85 }}
        />
        <div className="relative mx-auto max-w-[1240px] px-8 pb-16 pt-16 sm:pt-20">
          <h1
            className="max-w-[720px] text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--uz-font-display)" }}
          >
            {t("heroTitle")}
          </h1>
          <p className="mt-3.5 max-w-[620px] text-lg leading-relaxed" style={{ color: "#B9C6DC" }}>
            {t("heroSub")}
          </p>
          <div className="mt-8 max-w-lg">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap gap-3.5">
            <Link
              href="/membership/apply"
              className="rounded-md px-7 text-base font-semibold text-white"
              style={{ height: 52, lineHeight: "52px", background: "var(--uz-blue-600)" }}
            >
              {t("joinCta")}
            </Link>
            <Link
              href="/publications"
              className="rounded-md border px-7 text-base font-semibold text-white"
              style={{ height: 52, lineHeight: "50px", borderColor: "rgba(255,255,255,0.3)" }}
            >
              {t("browsePub")}
            </Link>
          </div>
        </div>
      </div>

      {/* INTENT PATHS */}
      <div className="relative mx-auto -mt-9 max-w-[1240px] px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl bg-white p-6 transition-shadow"
              style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mb-3.5">
                <g stroke="var(--uz-navy-700)" strokeWidth="1.8" strokeLinejoin="round" fill="none">
                  {CARD_ICONS[i]}
                </g>
              </svg>
              <h3 className="mb-1.5 text-[17px] font-semibold" style={{ color: "var(--uz-ink)" }}>
                {c.title}
              </h3>
              <p className="mb-3.5 text-[13.5px] leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                {c.sub}
              </p>
              <span className="text-sm font-semibold" style={{ color: "var(--uz-blue-600)" }}>
                {c.action} →
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* MISSION STRIP */}
      <div className="mx-auto max-w-[1240px] px-8 pb-2 pt-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
              <span
                className="text-[13px] font-bold tracking-[1.5px]"
                style={{ color: "var(--uz-navy-800)" }}
              >
                {t("missionKicker")}
              </span>
            </div>
            <h2
              className="mb-3.5 text-3xl font-bold leading-tight"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
            >
              {t("missionTitle")}
            </h2>
            <p className="mb-4 text-base leading-relaxed" style={{ color: "var(--uz-text)" }}>
              {t("missionBody")}
            </p>
            <Link href="/about" className="text-[15px] font-semibold">
              {t("missionLink")} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {facts.map((f) => (
              <div
                key={f.label}
                className="rounded-xl bg-white px-[22px] py-5"
                style={{ border: "1px solid var(--uz-border)" }}
              >
                <div
                  className="text-[34px] font-extrabold"
                  style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
                >
                  {f.value}
                </div>
                <div className="mt-1 text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KEY STATS */}
      <div className="relative mt-14 overflow-hidden" style={{ background: "var(--uz-navy-900)" }}>
        <span
          className="uz-slash pointer-events-none absolute -top-10 right-[12%] hidden w-20 sm:block"
          style={{ height: 260, background: "var(--uz-navy-800)" }}
        />
        <span
          className="uz-slash pointer-events-none absolute -top-10 right-[7%] hidden w-5 sm:block"
          style={{ height: 260, background: "var(--uz-blue-600)", opacity: 0.8 }}
        />
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-8 py-11 sm:grid-cols-3">
          <div>
            <div className="text-[52px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--uz-font-display)" }}>
              68
            </div>
            <div className="mt-2 text-[15px] font-medium" style={{ color: "#B9C6DC" }}>
              {t("s1")}
            </div>
          </div>
          <div className="border-white/10 pl-6 sm:border-l">
            <div className="text-[52px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--uz-font-display)" }}>
              9+
            </div>
            <div className="mt-2 text-[15px] font-medium" style={{ color: "#B9C6DC" }}>
              {t("s2")}
            </div>
          </div>
          <div className="border-white/10 pl-6 sm:border-l">
            <div
              className="text-[52px] font-extrabold leading-none"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-blue-400)" }}
            >
              100%
            </div>
            <div className="mt-2 text-[15px] font-medium" style={{ color: "#B9C6DC" }}>
              {t("s3")}
            </div>
          </div>
        </div>
      </div>

      {/* NEWS + EVENTS */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-8 py-14 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="mb-5 flex items-baseline justify-between">
            <div className="flex items-center gap-2.5">
              <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
              >
                {t("newsTitle")}
              </h2>
            </div>
            <Link href="/news" className="text-sm font-semibold">
              {t("allNews")}
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {t("noNews")}
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="rounded-xl bg-white px-6 py-[22px] transition-shadow"
                  style={{ border: "1px solid var(--uz-border)" }}
                >
                  <h3 className="mb-1.5 text-lg font-semibold leading-snug" style={{ color: "var(--uz-ink)" }}>
                    {article.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                    {article.summary}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-5 flex items-center gap-2.5">
            <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
            >
              {t("eventsTitle")}
            </h2>
          </div>
          <EmptyStateSection title="" emptyMessage={t("noEvents")} />
          <div className="mt-3.5 rounded-xl px-6 py-[22px]" style={{ background: "var(--uz-navy-900)" }}>
            <h3 className="mb-1.5 text-[17px] font-bold text-white" style={{ fontFamily: "var(--uz-font-display)" }}>
              {t("joinTitle")}
            </h3>
            <p className="mb-4 text-[13.5px] leading-relaxed" style={{ color: "#B9C6DC" }}>
              {t("joinBody")}
            </p>
            <Link
              href="/membership/apply"
              className="inline-block rounded-md px-[18px] text-sm font-semibold text-white"
              style={{ height: 40, lineHeight: "40px", background: "var(--uz-blue-600)" }}
            >
              {t("joinCta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
