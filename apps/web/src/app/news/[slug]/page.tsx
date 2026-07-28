import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  NewsArticleView,
  type NewsArticleDetail,
  type NewsListItem,
} from "@/components/NewsArticleView";

async function getArticle(slug: string): Promise<NewsArticleDetail | null> {
  try {
    return await api.get<NewsArticleDetail>(`/news/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function getOtherNews(currentSlug: string): Promise<NewsListItem[]> {
  try {
    const all = await api.get<NewsListItem[]>("/news");
    return all.filter((item) => item.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, otherNews] = await Promise.all([getArticle(slug), getOtherNews(slug)]);
  if (!article) notFound();

  return <NewsArticleView article={article} otherNews={otherNews} />;
}
