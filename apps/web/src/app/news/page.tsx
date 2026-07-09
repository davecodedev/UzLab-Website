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

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">News</h1>
      {news.length === 0 ? (
        <p className="mt-8 text-sm text-black/60 dark:text-white/60">No news published yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
          {news.map((article) => (
            <li key={article.id} className="py-4">
              <Link href={`/news/${article.slug}`} className="font-medium hover:underline">
                {article.title}
              </Link>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{article.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
