import { api } from "@/lib/api";
import { NewsListView, type NewsArticle } from "@/components/NewsListView";

async function getNews(): Promise<NewsArticle[]> {
  try {
    return await api.get<NewsArticle[]>("/news");
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const news = await getNews();
  return <NewsListView news={news} />;
}
