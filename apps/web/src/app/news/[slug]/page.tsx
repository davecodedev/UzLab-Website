import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  publishedAt: string | null;
}

async function getArticle(slug: string): Promise<NewsArticle | null> {
  try {
    return await api.get<NewsArticle>(`/news/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{article.title}</h1>
      <p className="mt-4 whitespace-pre-line text-black/80 dark:text-white/80">{article.bodyText}</p>
    </article>
  );
}
