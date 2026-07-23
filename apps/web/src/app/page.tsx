import { HomeView } from "@/components/HomeView";
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
  return <HomeView news={latestNews} />;
}
