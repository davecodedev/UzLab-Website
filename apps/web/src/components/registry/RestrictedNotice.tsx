"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";

const T = {
  heading: {
    ru: "Вы видите сокращённую карточку",
    uz: "Siz qisqartirilgan kartani ko'rmoqdasiz",
    en: "You are seeing the short version",
  },
  body: {
    ru: "Название и адрес открыты для всех. Номер аккредитации, срок действия, область, контакты и сертификаты доступны участникам UzLab.",
    uz: "Nomi va manzili hamma uchun ochiq. Akkreditatsiya raqami, amal qilish muddati, sohasi, kontaktlar va sertifikatlar UzLab a'zolari uchun ochiq.",
    en: "The name and address are open to everyone. Accreditation number, validity, scope, contacts and certificates are available to UzLab members.",
  },
  // The registry copies public registers, and saying so is more honest than
  // implying the information is otherwise unobtainable. What a membership buys
  // is having it in one place, searchable across scripts.
  note: {
    ru: "Эти сведения публикуют и сами государственные реестры — членство даёт их в одном месте, с поиском по любому языку и графике.",
    uz: "Bu ma'lumotlarni davlat reyestrlarining o'zi ham chop etadi — a'zolik ularni bitta joyda, istalgan til va yozuvda qidirish imkonini beradi.",
    en: "The national registers publish this too — membership puts it in one place, searchable in any language or script.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
  membership: { ru: "О членстве", uz: "A'zolik haqida", en: "About membership" },
} as const;

/**
 * Shown above the results when the viewer is not entitled to whole records.
 *
 * Stated plainly rather than as locked rows scattered through the table: a
 * reader should be able to tell at a glance what they have and what they do
 * not, instead of discovering it one empty cell at a time.
 */
export function RestrictedNotice() {
  const { lang } = useLang();

  return (
    <div
      className="mb-4 rounded-xl px-5 py-4"
      style={{ background: "var(--uz-blue-50)", border: "1px solid var(--uz-blue-100)" }}
    >
      <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {pick(T.heading, lang)}
      </p>
      <p className="mt-1.5 max-w-[75ch] text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
        {pick(T.body, lang)}
      </p>
      <p className="mt-1.5 max-w-[75ch] text-xs leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.note, lang)}
      </p>
      <p className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/login" className="underline underline-offset-2" style={{ color: "var(--uz-blue-600)" }}>
          {pick(T.signIn, lang)}
        </Link>
        <Link href="/membership" className="underline underline-offset-2" style={{ color: "var(--uz-blue-600)" }}>
          {pick(T.membership, lang)}
        </Link>
      </p>
    </div>
  );
}
