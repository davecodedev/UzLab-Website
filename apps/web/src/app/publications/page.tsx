import Link from "next/link";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { api } from "@/lib/api";

interface Publication {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  language: string;
  author: string | null;
  tags: string[];
}

type PublicationsSearchParams = {
  q?: string;
  category?: string;
  language?: string;
  author?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
};

async function getPublications(params: PublicationsSearchParams): Promise<Publication[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  try {
    return await api.get<Publication[]>(`/publications${qs ? `?${qs}` : ""}`);
  } catch {
    return [];
  }
}

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<PublicationsSearchParams>;
}) {
  const params = await searchParams;
  const publications = await getPublications(params);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Publications & Resources</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Cookbook, legislative documents, and international literature.
      </p>

      <div className="mt-8">
        <SearchFiltersForm action="/publications" values={params} />
      </div>

      {publications.length === 0 ? (
        <p className="mt-8 text-sm text-black/60 dark:text-white/60">No publications found.</p>
      ) : (
        <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
          {publications.map((pub) => (
            <li key={pub.id} className="py-4">
              <Link href={`/publications/${pub.slug}`} className="font-medium hover:underline">
                {pub.title}
              </Link>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{pub.summary}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                {[pub.category.replace(/_/g, " "), pub.language, pub.author]
                  .filter(Boolean)
                  .join(" · ")}
                {pub.tags.length > 0 ? ` · ${pub.tags.join(", ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
