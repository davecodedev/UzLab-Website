"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import { REGISTER_SITES } from "@/lib/provenance";

const FOOTER_DICT = {
  about: { ru: "О нас", uz: "Biz haqimizda", en: "About" },
  membership: { ru: "Членство", uz: "A'zolik", en: "Membership" },
  contact: { ru: "Контакты", uz: "Aloqa", en: "Contact" },
  address: {
    ru: "Ташкент, ул. Шифонур, 3/1",
    uz: "Toshkent, Shifonur ko'chasi, 3/1",
    en: "Tashkent, 3/1 Shifonur St.",
  },
  // Says on every page that the registry is a copy, and where the originals
  // are. No dates or counts here — the footer fetches nothing; the registry
  // page's provenance block reports how current the copy is.
  sourcePrefix: {
    ru: "Данные реестра — из государственных реестров",
    uz: "Reyestr ma'lumotlari",
    en: "Registry data is sourced from the national registers",
  },
  sourceConjunction: { ru: "и", uz: "va", en: "and" },
  sourceSuffix: {
    ru: "",
    uz: " davlat reyestrlaridan olingan",
    en: "",
  },
} as const;

export function Footer() {
  const { lang } = useLang();
  const links = [
    { href: "/about", label: pick(FOOTER_DICT.about, lang) },
    { href: "/membership", label: pick(FOOTER_DICT.membership, lang) },
    { href: "/contact", label: pick(FOOTER_DICT.contact, lang) },
  ];

  return (
    <footer className="mt-auto" style={{ background: "var(--uz-navy-950)" }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-8 py-10">
        {/* The real mark, not a text imitation of it. The footer is dark, so
            the logo sits on a white plate rather than being inverted — there is
            no light version of the asset. */}
        <Link href="/" className="flex flex-none items-center rounded-md bg-white px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed-height logo, next/image adds no value here */}
          <img src="/logo-uzlab.png" alt="UzLab" className="h-9 w-auto" />
        </Link>
        <div className="flex flex-wrap gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13.5px] font-medium" style={{ color: "#8494AC" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <span className="text-[13px]" style={{ color: "#5A6B85" }}>
          © {new Date().getFullYear()} UzLab · {pick(FOOTER_DICT.address, lang)}
        </span>
        <p className="basis-full text-[12.5px] leading-relaxed" style={{ color: "#5A6B85" }}>
          {pick(FOOTER_DICT.sourcePrefix, lang)}{" "}
          {REGISTER_SITES.map((site, i) => (
            <span key={site.url}>
              {i > 0 && <>{` ${pick(FOOTER_DICT.sourceConjunction, lang)} `}</>}
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
                style={{ color: "#8494AC" }}
              >
                {site.name}
              </a>
            </span>
          ))}
          {pick(FOOTER_DICT.sourceSuffix, lang)}.
        </p>
      </div>
    </footer>
  );
}
