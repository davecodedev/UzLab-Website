"use client";

import { useLang, pick } from "@/lib/i18n";

const T = {
  title: {
    ru: "Технический комитет",
    uz: "Texnik qo'mita",
    en: "Technical Committee",
  },
  description: {
    ru: "Модуль будет расширен несколькими функциями и ресурсами комитета. Архитектура рассчитана на дальнейшие дополнения без перестройки.",
    uz: "Ushbu modul qo'mitaning bir nechta funksiyalari va resurslari bilan kengaytiriladi. Arxitektura qayta qurishsiz yangi qo'shimchalarga mo'ljallangan.",
    en: "This module will grow to host several committee-specific functions and resources. Architecture reserved for future additions without restructuring.",
  },
  comingSoon: { ru: "Скоро.", uz: "Tez orada.", en: "Coming soon." },
};

export function TechnicalCommitteeView() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 text-black/70 dark:text-white/70">{t("description")}</p>
      <p className="mt-2 text-sm text-black/50 dark:text-white/50">{t("comingSoon")}</p>
    </div>
  );
}
