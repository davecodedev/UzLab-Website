import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { EmptyStateSection } from "@/components/EmptyStateSection";
import { api } from "@/lib/api";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: string | null;
}

async function getLatestNews(): Promise<NewsArticle[]> {
  try {
    const news = await api.get<NewsArticle[]>("/news");
    return news.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  const latestNews = await getLatestNews();

  return (
    <div>
      <section className="border-b border-black/10 px-6 py-20 dark:border-white/10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">UzLab</h1>
          <p className="mt-4 text-lg text-black/70 dark:text-white/70">
            The official digital platform of our professional association — membership,
            technical resources, and industry publications in one place.
          </p>
          <div className="mt-8 mx-auto max-w-lg">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-xl font-semibold">Our mission</h2>
        <p className="mt-3 text-black/70 dark:text-white/70">
          UzLab exists to support and represent our members through professional development,
          shared technical resources, and industry advocacy.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest news</h2>
          <Link href="/news" className="text-sm hover:underline">
            View all →
          </Link>
        </div>
        {latestNews.length === 0 ? (
          <p className="mt-4 text-sm text-black/60 dark:text-white/60">No news published yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {latestNews.map((article) => (
              <li key={article.id} className="border-b border-black/10 pb-4 dark:border-white/10">
                <Link href={`/news/${article.slug}`} className="font-medium hover:underline">
                  {article.title}
                </Link>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">{article.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <EmptyStateSection
          title="Upcoming events"
          emptyMessage="No upcoming events scheduled yet."
        />
      </section>
    </div>
  );
}
