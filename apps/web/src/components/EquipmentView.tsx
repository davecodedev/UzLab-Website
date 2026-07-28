"use client";

import { EmptyStateSection } from "@/components/EmptyStateSection";
import { useLang, pick } from "@/lib/i18n";

const T = {
  title: { ru: "Оборудование", uz: "Uskunalar", en: "Equipment" },
  intro: {
    ru: "Каталог оборудования и технические характеристики.",
    uz: "Uskunalar katalogi va texnik tavsiflar.",
    en: "Equipment catalogue and technical specifications.",
  },
  catalogueTitle: { ru: "Каталог оборудования", uz: "Uskunalar katalogi", en: "Equipment Catalogue" },
  catalogueEmpty: {
    ru: "Оборудование пока не добавлено.",
    uz: "Hozircha uskunalar qo'shilmagan.",
    en: "No equipment listed yet.",
  },
  specsTitle: { ru: "Технические характеристики", uz: "Texnik tavsiflar", en: "Technical Specifications" },
  specsEmpty: {
    ru: "Характеристики пока не опубликованы.",
    uz: "Tavsiflar hozircha e'lon qilinmagan.",
    en: "No specifications published yet.",
  },
  roadmap: {
    ru: "Технические руководства и модуль тендеров (RFP) запланированы на следующий этап — см. дорожную карту.",
    uz: "Texnik qo'llanmalar va tender (RFP) moduli keyingi bosqichga rejalashtirilgan — yo'l xaritasiga qarang.",
    en: "Technical guidelines and an RFP module are planned for a later phase — see the roadmap.",
  },
};

export function EquipmentView() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">{t("intro")}</p>

      <EmptyStateSection title={t("catalogueTitle")} emptyMessage={t("catalogueEmpty")} />
      <EmptyStateSection title={t("specsTitle")} emptyMessage={t("specsEmpty")} />

      <section className="mt-10 rounded-lg bg-black/[.03] p-4 text-sm text-black/50 dark:bg-white/[.05] dark:text-white/50">
        {t("roadmap")}
      </section>
    </div>
  );
}
