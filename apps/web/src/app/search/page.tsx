import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { api } from "@/lib/api";

interface SearchResultItem {
  type: "publication" | "news" | "member";
  id: string;
  title: string;
  summary: string;
  url: string;
}

async function search(q: string): Promise<SearchResultItem[]> {
  if (!q) return [];
  try {
    return await api.get<SearchResultItem[]>(`/search?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await search(q);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Search</h1>
      <div className="mt-6">
        <SearchBar initialQuery={q} />
      </div>

      {q && (
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
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
              {item.type}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
