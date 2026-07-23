import Link from "next/link";
import { api } from "@/lib/api";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: string | null;
}

async function getNews(): Promise<NewsArticle[]> {
  try {
    return await api.get<NewsArticle[]>("/news");
  } catch {
    return [];
  }
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

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

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>Новости</span>
        </nav>
      </div>

      {/* HEADER */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <Kicker>НОВОСТИ</Kicker>
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          Новости
        </h1>
      </div>

      {/* LIST */}
      <div className="mx-auto max-w-[1240px] px-8 py-8">
        {news.length === 0 ? (
          <p className="text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
            Новости пока не опубликованы.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((article) => {
              const date = formatDate(article.publishedAt);
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
