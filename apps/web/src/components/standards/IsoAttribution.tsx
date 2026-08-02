"use client";

import { useLang, pick } from "@/lib/i18n";
import { ISO_ATTRIBUTION } from "@/lib/standards";

const T = {
  heading: {
    ru: "Атрибуция ISO Open Data",
    uz: "ISO Open Data atributsiyasi",
    en: "ISO Open Data attribution",
  },
  // ISO's own wording, kept in English because that is how the licence
  // specifies the citation. The sentence around it is translated; the citation
  // itself is not ours to reword.
  basedOn: {
    ru: "Часть каталога основана на открытых данных ISO:",
    uz: "Katalogning bir qismi ISO ochiq ma'lumotlariga asoslangan:",
    en: "Part of this catalogue is based on ISO Open Data:",
  },
  licensedUnder: { ru: "лицензия", uz: "litsenziya", en: "licensed under" },
} as const;

/**
 * The condition attached to the ISO datasets. ODC-By permits sharing and
 * adapting them provided ISO is credited, so this is part of the right to hold
 * the data at all — it is rendered wherever those records are, not tucked into
 * a terms page nobody opens.
 */
export function IsoAttribution() {
  const { lang } = useLang();

  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-14 md:px-8">
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
        >
          {pick(T.heading, lang)}
        </h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.basedOn, lang)}{" "}
          {ISO_ATTRIBUTION.datasets.map((dataset, i) => (
            <span key={dataset.id}>
              {i > 0 && ", "}
              <a
                href={`${ISO_ATTRIBUTION.openDataUrl}#${dataset.id}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
                style={{ color: "var(--uz-blue-600)" }}
              >
                {dataset.id}
              </a>
            </span>
          ))}{" "}
          —{" "}
          <a
            href={ISO_ATTRIBUTION.openDataUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--uz-blue-600)" }}
          >
            ISO Open Data
          </a>
          , {pick(T.licensedUnder, lang)}{" "}
          <a
            href={ISO_ATTRIBUTION.licenceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--uz-blue-600)" }}
          >
            {ISO_ATTRIBUTION.licenceName}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
