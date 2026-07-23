"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";

const FOOTER_DICT = {
  about: { ru: "О нас", uz: "Biz haqimizda", en: "About" },
  membership: { ru: "Членство", uz: "A'zolik", en: "Membership" },
  publications: { ru: "Публикации", uz: "Nashrlar", en: "Publications" },
  contact: { ru: "Контакты", uz: "Aloqa", en: "Contact" },
} as const;

export function Footer() {
  const { lang } = useLang();
  const links = [
    { href: "/about", label: pick(FOOTER_DICT.about, lang) },
    { href: "/membership", label: pick(FOOTER_DICT.membership, lang) },
    { href: "/publications", label: pick(FOOTER_DICT.publications, lang) },
    { href: "/contact", label: pick(FOOTER_DICT.contact, lang) },
  ];

  return (
    <footer className="mt-auto" style={{ background: "var(--uz-navy-950)" }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-8 py-10">
        <div className="flex items-end leading-none" style={{ fontFamily: "var(--uz-font-display)" }}>
          <span className="text-xl font-extrabold text-white">Uz</span>
          <span
            className="uz-slash mx-[1px] mb-1 inline-block h-4 w-1"
            style={{ background: "var(--uz-blue-400)" }}
          />
          <span className="text-xl font-extrabold" style={{ color: "var(--uz-blue-400)" }}>
            ab
          </span>
        </div>
        <div className="flex flex-wrap gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13.5px] font-medium" style={{ color: "#8494AC" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <span className="text-[13px]" style={{ color: "#5A6B85" }}>
          © {new Date().getFullYear()} UzLab
        </span>
      </div>
    </footer>
  );
}
