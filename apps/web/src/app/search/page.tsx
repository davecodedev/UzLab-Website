import Link from "next/link";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { api } from "@/lib/api";

interface SearchResultItem {
  type: "publication" | "news" | "member";
  id: string;
  title: string;
  summary: string;
  url: string;
  category?: string;
  language?: string;
  tags?: string[];
  author?: string | null;
  publishedAt?: string | null;
}

type SearchParams = {
  q?: string;
  type?: string;
  category?: string;
  language?: string;
  author?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
};

async function search(params: SearchParams): Promise<SearchResultItem[]> {
  const hasAnyValue = Object.values(params).some((v) => !!v);
  if (!hasAnyValue) return [];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  try {
    return await api.get<SearchResultItem[]>(`/search?${query.toString()}`);
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const results = await search(params);
  const hasQuery = Object.values(params).some((v) => !!v);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Search</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Search across publications, news, and the members directory.
      </p>

      <div className="mt-6">
        <SearchFiltersForm action="/search" values={params} showType />
      </div>

      {hasQuery && (
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>
      )}

      <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
        {results.map((item) => (
          <li key={`${item.type}-${item.id}`} className="py-4">
            <Link href={item.url} className="font-medium hover:underline">
              {item.title}
            </Link>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">{item.summary}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
              {[item.type, item.category, item.language, item.author]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
