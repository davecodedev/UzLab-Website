"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";

const UI = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  breadcrumbAbout: { ru: "О нас", uz: "Biz haqimizda", en: "About" },
  pageTitle: { ru: "Об ассоциации", uz: "Assotsiatsiya haqida", en: "About the association" },

  navMission: { ru: "Миссия", uz: "Missiya", en: "Mission" },
  navGoals: { ru: "Цели", uz: "Maqsadlar", en: "Goals" },
  navCharter: { ru: "Устав", uz: "Nizom", en: "Charter" },

  missionKicker: { ru: "МИССИЯ", uz: "MISSIYA", en: "MISSION" },
  missionTitle: {
    ru: "Развитие лабораторной практики Узбекистана",
    uz: "O'zbekiston laboratoriya amaliyotini rivojlantirish",
    en: "Advancing laboratory practice in Uzbekistan",
  },
  missionBody: {
    ru: "Ассоциация лабораторий Узбекистана (UzLAB) официально зарегистрирована в Министерстве юстиции 16 июля 2025 года за №2880628 — для развития лабораторной деятельности в стране, адаптации к международным стандартам и повышения квалификации персонала. За короткое время ассоциация объединила 68 членов: лаборатории, научно-исследовательские институты и учебные заведения, поставщиков оборудования и реактивов, а также специалистов и учёных отрасли.",
    uz: "O'zbekiston laboratoriyalari assotsiatsiyasi (UzLAB) 2025-yil 16-iyulda Adliya vazirligida №2880628 raqami bilan rasmiy ro'yxatdan o'tgan — mamlakatda laboratoriya faoliyatini rivojlantirish, xalqaro standartlarga moslashish va xodimlar malakasini oshirish maqsadida. Qisqa vaqt ichida assotsiatsiya 68 nafar a'zoni birlashtirdi: laboratoriyalar, ilmiy-tadqiqot institutlari va o'quv muassasalari, uskuna va reaktiv yetkazib beruvchilar hamda soha mutaxassislari va olimlari.",
    en: "The Association of Laboratories of Uzbekistan (UzLAB) was officially registered with the Ministry of Justice on 16 July 2025 under No. 2880628 — to develop laboratory activity in the country, align it with international standards and raise the qualifications of personnel. In a short time the association has united 68 members: laboratories, research institutes and educational establishments, equipment and reagent suppliers, as well as specialists and scientists of the sector.",
  },

  fact1: { ru: "год регистрации в Минюсте", uz: "Adliya vazirligida ro'yxatdan o'tgan yil", en: "year registered with the Ministry of Justice" },
  fact2: { ru: "членов ассоциации", uz: "assotsiatsiya a'zolari", en: "association members" },
  fact3: { ru: "отраслей экономики", uz: "iqtisodiyot tarmoqlari", en: "sectors of the economy" },
  fact4: { ru: "охват территории страны", uz: "mamlakat hududini qamrab olish", en: "coverage of the country" },

  goalsKicker: { ru: "ТРИ ЦЕЛИ", uz: "UCHTA MAQSAD", en: "THREE GOALS" },
  goal1Title: {
    ru: "Представление интересов сектора",
    uz: "Soha manfaatlarini ifodalash",
    en: "Representing the sector's interests",
  },
  goal1Body: {
    ru: "Представлять интересы сектора оценки соответствия по техническим вопросам, влияющим на национальную инфраструктуру качества, — ради безопасности потребителей, конкурентоспособности предприятий и устойчивости внутреннего рынка.",
    uz: "Milliy sifat infratuzilmasiga ta'sir qiluvchi texnik masalalarda muvofiqlikni baholash sohasi manfaatlarini ifodalash — iste'molchilar xavfsizligi, korxonalar raqobatbardoshligi va ichki bozor barqarorligi yo'lida.",
    en: "Representing the conformity assessment sector on technical matters affecting the national quality infrastructure — for consumer safety, business competitiveness and a stable domestic market.",
  },
  goal2Title: {
    ru: "Связи и обмен знаниями",
    uz: "Aloqalar va bilim almashish",
    en: "Networking and knowledge sharing",
  },
  goal2Body: {
    ru: "Налаживать связи и обмениваться знаниями с ключевыми заинтересованными сторонами инфраструктуры качества, избегая дублирования усилий и усиливая позиции сектора оценки соответствия.",
    uz: "Sifat infratuzilmasining asosiy manfaatdor tomonlari bilan aloqalar o'rnatish va bilim almashish, sa'y-harakatlar takrorlanishining oldini olish va muvofiqlikni baholash sohasi mavqeyini mustahkamlash.",
    en: "Building connections and sharing knowledge with key quality infrastructure stakeholders, avoiding duplicated effort and strengthening the position of the conformity assessment sector.",
  },
  goal3Title: {
    ru: "Развитие нормативной базы",
    uz: "Normativ bazani rivojlantirish",
    en: "Developing the regulatory framework",
  },
  goal3Body: {
    ru: "Участвовать в ключевых изменениях нормативно-технической базы: аналитические доклады, технические отчёты, методические пособия, семинары и заседания технических рабочих групп.",
    uz: "Normativ-texnik bazadagi muhim o'zgarishlarda ishtirok etish: tahliliy ma'ruzalar, texnik hisobotlar, uslubiy qo'llanmalar, seminarlar va texnik ishchi guruhlar yig'ilishlari.",
    en: "Taking part in key changes to the regulatory and technical framework: analytical papers, technical reports, methodological guides, seminars and technical working group meetings.",
  },

  charterKicker: { ru: "УСТАВ И ДОКУМЕНТЫ", uz: "NIZOM VA HUJJATLAR", en: "CHARTER AND DOCUMENTS" },
  doc1Title: {
    ru: "Устав Ассоциации лабораторий Узбекистана (2025)",
    uz: "O'zbekiston laboratoriyalari assotsiatsiyasi nizomi (2025)",
    en: "Charter of the Association of Laboratories of Uzbekistan (2025)",
  },
  doc2Title: {
    ru: "Положение о членстве и членских взносах",
    uz: "A'zolik va a'zolik badallari to'g'risidagi nizom",
    en: "Regulations on membership and membership fees",
  },
  doc3Title: {
    ru: "Положение о техническом комитете",
    uz: "Texnik qo'mita to'g'risidagi nizom",
    en: "Regulations on the technical committee",
  },
  doc1Size: { ru: "PDF · 0,6 МБ", uz: "PDF · 0,6 MB", en: "PDF · 0.6 MB" },
  doc2Size: { ru: "PDF · 0,3 МБ", uz: "PDF · 0,3 MB", en: "PDF · 0.3 MB" },
  doc3Size: { ru: "PDF · 0,2 МБ", uz: "PDF · 0,2 MB", en: "PDF · 0.2 MB" },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
      <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
        {children}
      </span>
    </div>
  );
}

export function AboutView() {
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const navLinks = [
    { href: "#mission", label: t("navMission") },
    { href: "#goals", label: t("navGoals") },
    { href: "#charter", label: t("navCharter") },
  ];

  const facts = [
    { value: "2025", label: t("fact1") },
    { value: "68", label: t("fact2") },
    { value: "9+", label: t("fact3") },
    { value: "100%", label: t("fact4") },
  ];

  const goals = [
    { number: "01", title: t("goal1Title"), body: t("goal1Body") },
    { number: "02", title: t("goal2Title"), body: t("goal2Body") },
    { number: "03", title: t("goal3Title"), body: t("goal3Body") },
  ];

  const documents = [
    { code: "УзЛаб-У-2025", title: t("doc1Title"), lang: "RU · UZ", size: t("doc1Size") },
    { code: "УзЛаб-П-01", title: t("doc2Title"), lang: "RU · UZ", size: t("doc2Size") },
    { code: "УзЛаб-П-02", title: t("doc3Title"), lang: "RU", size: t("doc3Size") },
  ];

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            {t("breadcrumbHome")}
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>{t("breadcrumbAbout")}</span>
        </nav>
      </div>

      {/* HEADER + IN-PAGE NAV */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("pageTitle")}
        </h1>
        <div className="mt-5 flex flex-wrap gap-6 border-b" style={{ borderColor: "var(--uz-border)" }}>
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className="pb-3 text-sm font-semibold"
              style={
                i === 0
                  ? { color: "var(--uz-blue-600)", borderBottom: "2px solid var(--uz-blue-600)" }
                  : { color: "var(--uz-text-muted)" }
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* MISSION */}
      <div id="mission" className="mx-auto max-w-[1240px] px-8 py-12 scroll-mt-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Kicker>{t("missionKicker")}</Kicker>
            <h2
              className="mb-3.5 text-3xl font-bold leading-tight"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
            >
              {t("missionTitle")}
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--uz-text)" }}>
              {t("missionBody")}
            </p>
          </div>
          <div className="rounded-xl p-6" style={{ background: "var(--uz-navy-900)" }}>
            <div className="grid grid-cols-2 gap-6">
              {facts.map((f) => (
                <div key={f.value}>
                  <div
                    className="text-[34px] font-extrabold leading-none text-white"
                    style={{ fontFamily: "var(--uz-font-display)" }}
                  >
                    {f.value}
                  </div>
                  <div className="mt-2 text-[13.5px]" style={{ color: "#8494AC" }}>
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GOALS */}
      <div id="goals" className="mx-auto max-w-[1240px] px-8 py-12 scroll-mt-20">
        <Kicker>{t("goalsKicker")}</Kicker>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {goals.map((goal) => (
            <div
              key={goal.number}
              className="rounded-xl bg-white p-6"
              style={{ border: "1px solid var(--uz-border)" }}
            >
              <div
                className="mb-3 text-2xl font-semibold"
                style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-blue-600)" }}
              >
                {goal.number}
              </div>
              <h3 className="mb-2 text-[17px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
                {goal.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                {goal.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTER */}
      <div id="charter" className="mx-auto max-w-[1240px] px-8 py-12 scroll-mt-20">
        <Kicker>{t("charterKicker")}</Kicker>
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--uz-border)" }}>
          {documents.map((doc, i) => (
            <div
              key={doc.code}
              className="flex flex-wrap items-center gap-4 px-6 py-5"
              style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
            >
              <span
                className="rounded-md px-2.5 py-1 text-xs font-semibold"
                style={{
                  fontFamily: "var(--uz-font-mono)",
                  color: "var(--uz-blue-700)",
                  background: "var(--uz-blue-50)",
                }}
              >
                {doc.code}
              </span>
              <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--uz-ink)" }}>
                {doc.title}
              </span>
              <span className="text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
                {doc.lang}
              </span>
              <span className="text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
                {doc.size}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
