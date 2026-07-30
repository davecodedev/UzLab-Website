"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import { formatDateLong } from "@/lib/format";

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: string | null;
}

const UI = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  breadcrumbNews: { ru: "Новости", uz: "Yangiliklar", en: "News" },
  kicker: { ru: "НОВОСТИ", uz: "YANGILIKLAR", en: "NEWS" },
  pageTitle: { ru: "Новости", uz: "Yangiliklar", en: "News" },
  empty: {
    ru: "Новости пока не опубликованы.",
    uz: "Yangiliklar hali chop etilmagan.",
    en: "No news has been published yet.",
  },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
      <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
        {children}
      </span>
    </div>
  );
}

export function NewsListView({ news }: { news: NewsArticle[] }) {
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            {t("breadcrumbHome")}
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>{t("breadcrumbNews")}</span>
        </nav>
      </div>

      {/* HEADER */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <Kicker>{t("kicker")}</Kicker>
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("pageTitle")}
        </h1>
      </div>

      {/* LIST */}
      <div className="mx-auto max-w-[1240px] px-8 py-8">
        {news.length === 0 ? (
          <p className="text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
            {t("empty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((article) => {
              const date = formatDateLong(article.publishedAt, lang);
              return (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="rounded-xl bg-white p-6 transition-shadow hover:shadow-[var(--uz-shadow-md)]"
                  style={{ border: "1px solid var(--uz-border)" }}
                >
                  {date && (
                    <div
                      className="mb-2 text-[12.5px]"
                      style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-faint)" }}
                    >
                      {date}
                    </div>
                  )}
                  <h3 className="text-[17px] font-semibold leading-snug" style={{ color: "var(--uz-ink)" }}>
                    {article.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                    {article.summary}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
