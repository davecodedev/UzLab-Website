import Link from "next/link";
import { api } from "@/lib/api";

interface Publication {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  language: string;
}

async function getPublications(q?: string): Promise<Publication[]> {
  try {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return await api.get<Publication[]>(`/publications${query}`);
  } catch {
    return [];
  }
}

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const publications = await getPublications(q);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Publications & Resources</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Cookbook, legislative documents, and international literature.
      </p>

      <form className="mt-8 flex gap-2" action="/publications">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search publications…"
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </form>

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
                {pub.category.replace(/_/g, " ")} · {pub.language}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
