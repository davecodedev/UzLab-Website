import Link from "next/link";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { api } from "@/lib/api";

interface SearchResultItem {
  type: "publication" | "news" | "member" | "laboratory";
  id: string;
  title: string;
  summary: string;
  url: string;
  category?: string;
  language?: string;
  tags?: string[];
  author?: string | null;
  publishedAt?: string | null;
  region?: string | null;
}

type SearchParams = {
  q?: string;
  type?: string;
  category?: string;
  language?: string;
  author?: string;
  tags?: string;
  region?: string;
  labField?: string;
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
    <div className="mx-auto max-w-[860px] px-8 py-14">
      <h1
        className="text-[34px] font-extrabold leading-[1.1]"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Поиск
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--uz-text-muted)" }}>
        Публикации, новости, члены ассоциации и лаборатории — в одном поиске.
      </p>

      <div className="mt-6">
        <SearchFiltersForm action="/search" values={params} showType />
      </div>

      {hasQuery && (
        <p className="mt-6 text-sm" style={{ color: "var(--uz-text-muted)" }}>
          {results.length} результат{results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}
        </p>
      )}

      {results.length > 0 && (
        <div
          className="mt-4 overflow-hidden rounded-xl bg-white"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          {results.map((item, i) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.url}
              className="block px-6 py-4 transition-colors hover:bg-[var(--uz-blue-50)]"
              style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
            >
              <span className="font-medium" style={{ color: "var(--uz-ink)" }}>
                {item.title}
              </span>
              <p className="mt-1 text-sm" style={{ color: "var(--uz-text-muted)" }}>
                {item.summary}
              </p>
              <p
                className="mt-1 text-xs uppercase tracking-wide"
                style={{ color: "var(--uz-text-faint)" }}
              >
                {[item.type, item.category, item.language, item.author, item.region]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
