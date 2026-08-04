"use client";

import { useLang, pick } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";

/**
 * The site search page's own words.
 *
 * Split out of the page because that page is a Server Component — it awaits
 * `searchParams` and fetches on the server — and the language lives in the
 * browser. Only these two fragments need the toggle, so only these two move.
 */

const T = {
  title: { ru: "Поиск", uz: "Qidiruv", en: "Search" },
  subtitle: {
    ru: "Новости, члены ассоциации и лаборатории — в одном поиске.",
    uz: "Yangiliklar, uyushma a'zolari va laboratoriyalar — bitta qidiruvda.",
    en: "News, association members and laboratories — in one search.",
  },
} as const;

export function SearchPageHeading() {
  const { lang } = useLang();
  return (
    <>
      <h1
        className="text-[34px] font-extrabold leading-[1.1]"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {pick(T.title, lang)}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.subtitle, lang)}
      </p>
    </>
  );
}

/**
 * Russian agreement follows the last digits, not the size of the number: 1 and
 * 21 take the singular, 2–4 and 22–24 the paired form, and the teens take the
 * plural regardless. The previous wording branched on `< 5`, which read
 * "0 результата" and "21 результатов".
 */
function russianResults(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "результатов";
  if (mod10 === 1) return "результат";
  if (mod10 >= 2 && mod10 <= 4) return "результата";
  return "результатов";
}

export function SearchResultCount({ count }: { count: number }) {
  const { lang } = useLang();
  const n = formatNumber(count, lang);

  const text =
    lang === "ru"
      ? `${n} ${russianResults(count)}`
      : lang === "uz"
        ? `${n} ta natija`
        : `${n} ${count === 1 ? "result" : "results"}`;

  return (
    <p className="mt-6 text-sm" style={{ color: "var(--uz-text-muted)" }}>
      {text}
    </p>
  );
}
