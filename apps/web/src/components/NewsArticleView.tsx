"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import { formatNewsDate, type NewsArticle as NewsListItem } from "@/components/NewsListView";

export interface NewsArticleDetail {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  publishedAt: string | null;
}

export type { NewsListItem };

const UI = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  breadcrumbNews: { ru: "Новости", uz: "Yangiliklar", en: "News" },
  otherNews: { ru: "ДРУГИЕ НОВОСТИ", uz: "BOSHQA YANGILIKLAR", en: "OTHER NEWS" },
};

export function NewsArticleView({
  article,
  otherNews,
}: {
  article: NewsArticleDetail;
  otherNews: NewsListItem[];
}) {
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const date = formatNewsDate(article.publishedAt, lang);

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            {t("breadcrumbHome")}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="hover:underline">
            {t("breadcrumbNews")}
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>{article.title}</span>
        </nav>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-[1240px] px-8 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <article
            className="rounded-xl bg-white p-10"
            style={{ border: "1px solid var(--uz-border)" }}
          >
            {date && (
              <div
                className="mb-3 text-[12.5px]"
                style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-faint)" }}
              >
                {date}
              </div>
            )}
            <h1
              className="text-[30px] font-extrabold leading-tight"
              style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
            >
              {article.title}
            </h1>
            <p
              className="mt-6 whitespace-pre-line text-[17px] leading-[1.65]"
              style={{ color: "var(--uz-text)" }}
            >
              {article.bodyText}
            </p>
          </article>

          {/* SIDEBAR */}
          {otherNews.length > 0 && (
            <aside>
              <div className="mb-3.5 flex items-center gap-2.5">
                <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
                <span
                  className="text-[13px] font-bold tracking-[1.5px]"
                  style={{ color: "var(--uz-navy-800)" }}
                >
                  {t("otherNews")}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {otherNews.map((item) => {
                  const itemDate = formatNewsDate(item.publishedAt, lang);
                  return (
                    <Link
                      key={item.id}
                      href={`/news/${item.slug}`}
                      className="rounded-xl bg-white p-5 transition-shadow hover:shadow-[var(--uz-shadow-md)]"
                      style={{ border: "1px solid var(--uz-border)" }}
                    >
                      {itemDate && (
                        <div
                          className="mb-1.5 text-[12px]"
                          style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-faint)" }}
                        >
                          {itemDate}
                        </div>
                      )}
                      <h3
                        className="text-[14.5px] font-semibold leading-snug"
                        style={{ color: "var(--uz-ink)" }}
                      >
                        {item.title}
                      </h3>
                    </Link>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
