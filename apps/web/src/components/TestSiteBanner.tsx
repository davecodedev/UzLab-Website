"use client";

import { useLang, pick } from "@/lib/i18n";

const T = {
  notice: {
    ru: "Это тестовая версия сайта UzLab. Содержимое и данные не являются окончательными.",
    uz: "Bu UzLab saytining sinov versiyasi. Mazmun va ma'lumotlar yakuniy emas.",
    en: "This is a test version of the UzLab website. Content and data shown here are not final.",
  },
  // Held separately so the emphasis lands on the right words in each language,
  // rather than on whatever happens to sit where the English phrase did.
  emphasis: {
    ru: "тестовая версия",
    uz: "sinov versiyasi",
    en: "test version",
  },
} as const;

/**
 * Sits above every page, which made it the most visible untranslated text on
 * the site — it read in English whatever the language toggle said.
 */
export function TestSiteBanner() {
  const { lang } = useLang();
  const notice = pick(T.notice, lang);
  const emphasis = pick(T.emphasis, lang);

  const at = notice.indexOf(emphasis);
  const before = at >= 0 ? notice.slice(0, at) : notice;
  const after = at >= 0 ? notice.slice(at + emphasis.length) : "";

  return (
    // The icon sits inside the sentence rather than beside it: as a separate
    // flex item it ends up floating at the vertical middle of a three-line
    // wrap on a phone, detached from the words it belongs to.
    <div className="border-b border-warning-border bg-warning-bg px-4 py-2 text-center text-sm text-warning-foreground">
      <p className="mx-auto max-w-[70ch]">
        <span aria-hidden="true">⚠️ </span>
        {before}
        {at >= 0 && <strong>{emphasis}</strong>}
        {after}
      </p>
    </div>
  );
}
