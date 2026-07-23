import Link from "next/link";

const NAV_LINKS = [
  { href: "#mission", label: "Миссия" },
  { href: "#goals", label: "Цели" },
  { href: "#leadership", label: "Руководство" },
  { href: "#charter", label: "Устав" },
];

const GOALS = [
  {
    number: "01",
    title: "Представление интересов сектора",
    body: "Представлять интересы сектора оценки соответствия по техническим вопросам, влияющим на национальную инфраструктуру качества, — ради безопасности потребителей, конкурентоспособности предприятий и устойчивости внутреннего рынка.",
  },
  {
    number: "02",
    title: "Связи и обмен знаниями",
    body: "Налаживать связи и обмениваться знаниями с ключевыми заинтересованными сторонами инфраструктуры качества, избегая дублирования усилий и усиливая позиции сектора оценки соответствия.",
  },
  {
    number: "03",
    title: "Развитие нормативной базы",
    body: "Участвовать в ключевых изменениях нормативно-технической базы: аналитические доклады, технические отчёты, методические пособия, семинары и заседания технических рабочих групп.",
  },
];

const LEADERSHIP = [
  { role: "Председатель" },
  { role: "Заместитель председателя" },
  { role: "Исполнительный директор" },
  { role: "Председатель техкомитета" },
];

const DOCUMENTS = [
  {
    code: "УзЛаб-У-2025",
    title: "Устав Ассоциации лабораторий Узбекистана (2025)",
    lang: "RU · UZ",
    size: "PDF · 0,6 МБ",
  },
  {
    code: "УзЛаб-П-01",
    title: "Положение о членстве и членских взносах",
    lang: "RU · UZ",
    size: "PDF · 0,3 МБ",
  },
  {
    code: "УзЛаб-П-02",
    title: "Положение о техническом комитете",
    lang: "RU",
    size: "PDF · 0,2 МБ",
  },
];

const FACTS = [
  { value: "2025", label: "год регистрации в Минюсте" },
  { value: "68", label: "членов ассоциации" },
  { value: "9+", label: "отраслей экономики" },
  { value: "100%", label: "охват территории страны" },
];

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

export default function AboutPage() {
  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>О нас</span>
        </nav>
      </div>

      {/* HEADER + IN-PAGE NAV */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          Об ассоциации
        </h1>
        <div className="mt-5 flex flex-wrap gap-6 border-b" style={{ borderColor: "var(--uz-border)" }}>
          {NAV_LINKS.map((link, i) => (
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
            <Kicker>МИССИЯ</Kicker>
            <h2
              className="mb-3.5 text-3xl font-bold leading-tight"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
            >
              Развитие лабораторной практики Узбекистана
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--uz-text)" }}>
              Ассоциация лабораторий Узбекистана (UzLAB) официально зарегистрирована в Министерстве
              юстиции 16 июля 2025 года за №2880628 — для развития лабораторной деятельности в
              стране, адаптации к международным стандартам и повышения квалификации персонала. За
              короткое время ассоциация объединила 68 членов: лаборатории, научно-исследовательские
              институты и учебные заведения, поставщиков оборудования и реактивов, а также
              специалистов и учёных отрасли.
            </p>
          </div>
          <div className="rounded-xl p-6" style={{ background: "var(--uz-navy-900)" }}>
            <div className="grid grid-cols-2 gap-6">
              {FACTS.map((f) => (
                <div key={f.label}>
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
        <Kicker>ТРИ ЦЕЛИ</Kicker>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {GOALS.map((goal) => (
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

      {/* LEADERSHIP */}
      <div id="leadership" className="mx-auto max-w-[1240px] px-8 py-12 scroll-mt-20">
        <Kicker>РУКОВОДСТВО</Kicker>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LEADERSHIP.map((person) => (
            <div
              key={person.role}
              className="rounded-xl bg-white p-6 text-center"
              style={{ border: "1px solid var(--uz-border)" }}
            >
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "var(--uz-blue-50)",
                  border: "1px dashed var(--uz-border-strong)",
                }}
              >
                <span
                  className="text-[10px] font-medium tracking-[1px]"
                  style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-faint)" }}
                >
                  ФОТО
                </span>
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
                {person.role}
              </h3>
              <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
                ФИО уточняется
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
          Фотографии и имена руководства — по материалам ассоциации; в макете стоят заглушки.
        </p>
      </div>

      {/* CHARTER */}
      <div id="charter" className="mx-auto max-w-[1240px] px-8 py-12 scroll-mt-20">
        <Kicker>УСТАВ И ДОКУМЕНТЫ</Kicker>
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--uz-border)" }}>
          {DOCUMENTS.map((doc, i) => (
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
