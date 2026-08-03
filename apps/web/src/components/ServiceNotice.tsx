"use client";

import { useLang, pick } from "@/lib/i18n";

const T = {
  heading: {
    ru: "Данные временно недоступны",
    uz: "Ma'lumotlar vaqtincha mavjud emas",
    en: "This data is temporarily unavailable",
  },
  body: {
    ru: "Мы расширяем хранилище базы данных. Реестр и каталог вернутся, как только работы закончатся — сами данные не пострадали, официальные реестры доступны по ссылкам ниже.",
    uz: "Biz ma'lumotlar bazasi xotirasini kengaytirmoqdamiz. Reyestr va katalog ishlar tugashi bilan qaytadi — ma'lumotlarning o'ziga zarar yetmagan, rasmiy reyestrlar quyidagi havolalar orqali mavjud.",
    en: "We are expanding the database's storage. The registry and catalogue will be back as soon as that is done — no data has been lost, and the official registers are available at the links below.",
  },
  meanwhile: {
    ru: "Первоисточники:",
    uz: "Birlamchi manbalar:",
    en: "The sources themselves:",
  },
} as const;

const SOURCES = [
  { name: "O'zAkk", url: "https://akkred.uz/uz/reestr" },
  { name: "Depstan", url: "https://approval.depstan.uz/" },
  { name: "UZSTI", url: "https://uzsti.uz/shop?group=milliy" },
  { name: "МГС (GOST)", url: "https://mgscatalog.by/" },
];

/**
 * Shown in place of a list whose data could not be fetched.
 *
 * Deliberately specific rather than a generic error: a reader who came for a
 * laboratory's accreditation needs to know the record still exists and where to
 * read it, not that "something went wrong". Pointing at the official registers
 * costs us a visit and is the honest thing to do — they are the authority
 * anyway.
 */
export function ServiceNotice() {
  const { lang } = useLang();

  return (
    <section className="mx-auto max-w-[900px] px-6 py-16 md:px-8">
      <div
        className="rounded-xl px-6 py-6"
        style={{
          background: "var(--uz-warning-bg)",
          border: "1px solid var(--uz-warning)",
        }}
      >
        <h1
          className="text-lg font-extrabold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {pick(T.heading, lang)}
        </h1>
        <p className="mt-3 max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
          {pick(T.body, lang)}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span style={{ color: "var(--uz-text-faint)" }}>{pick(T.meanwhile, lang)}</span>
          {SOURCES.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--uz-blue-600)" }}
            >
              {s.name} ↗
            </a>
          ))}
        </p>
      </div>
    </section>
  );
}
