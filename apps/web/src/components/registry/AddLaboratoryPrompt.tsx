"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredUser, isStaff } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";

// A discreet way out of the registry for members whose laboratory is in
// neither national register. Deliberately rendered as a sibling of RegistryApp
// rather than inside it: the registry owns its own `--reg-*` design system, and
// this line belongs to the site chrome, so it uses the site-wide `--uz-*`
// tokens and sits below the results instead of competing with the filters.

const UI = {
  question: {
    ru: "Не нашли свою лабораторию?",
    uz: "Laboratoriyangizni topa olmadingizmi?",
    en: "Can't find your laboratory?",
  },
  cta: {
    ru: "Добавьте её",
    uz: "Uni qo'shing",
    en: "Add it",
  },
  note: {
    ru: "Реестр собран из реестров O'zAkk и Depstan. Если лаборатории нет ни в одном из них, её можно добавить самостоятельно — после проверки она появится в поиске.",
    uz: "Reyestr O'zAkk va Depstan reyestrlaridan yig'ilgan. Agar laboratoriya ularning birortasida bo'lmasa, uni o'zingiz qo'shishingiz mumkin — tekshiruvdan so'ng u qidiruvda paydo bo'ladi.",
    en: "This register is compiled from the O'zAkk and Depstan registers. If a laboratory is in neither, you can add it yourself — once reviewed, it shows up in search.",
  },
} as const;

export function AddLaboratoryPrompt() {
  const { lang } = useLang();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Staff add and edit laboratories through the admin panel, and review the
    // submissions this prompt produces — inviting them to file one against
    // themselves is just noise. Hidden until we know who is looking, so it
    // never flashes for an admin on first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
    setHidden(isStaff(getStoredUser()));
  }, []);

  if (hidden) return null;

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 md:px-8">
      <div
        className="rounded-xl px-5 py-4 text-sm"
        style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
      >
        <p style={{ color: "var(--uz-text)" }}>
          <span className="font-semibold">{pick(UI.question, lang)}</span>{" "}
          <Link
            href="/account/laboratories/new"
            className="font-semibold hover:underline"
            style={{ color: "var(--uz-blue-700)" }}
          >
            {pick(UI.cta, lang)}
          </Link>
        </p>
        <p className="mt-1 leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {pick(UI.note, lang)}
        </p>
      </div>
    </div>
  );
}
