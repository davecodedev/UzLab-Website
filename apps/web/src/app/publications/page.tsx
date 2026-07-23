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
    <div className="mx-auto max-w-[1024px] px-8 py-14">
      <h1
        className="text-[34px] font-extrabold leading-[1.1]"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Публикации и ресурсы
      </h1>
      <p className="mt-2 max-w-[620px] text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        Сборники методик, нормативные акты и международная литература.
      </p>

      <div className="mt-8">
        <SearchFiltersForm action="/publications" values={params} />
      </div>

      {publications.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--uz-text-muted)" }}>
          Публикации не найдены.
        </p>
      ) : (
        <div
          className="mt-8 overflow-hidden rounded-xl bg-white"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          {publications.map((pub, i) => (
            <Link
              key={pub.id}
              href={`/publications/${pub.slug}`}
              className="block px-6 py-4 transition-colors hover:bg-[var(--uz-blue-50)]"
              style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
            >
              <span className="font-medium" style={{ color: "var(--uz-ink)" }}>
                {pub.title}
              </span>
              <p className="mt-1 text-sm" style={{ color: "var(--uz-text-muted)" }}>
                {pub.summary}
              </p>
              <p
                className="mt-1 text-xs uppercase tracking-wide"
                style={{ color: "var(--uz-text-faint)" }}
              >
                {[pub.category.replace(/_/g, " "), pub.language, pub.author]
                  .filter(Boolean)
                  .join(" · ")}
                {pub.tags.length > 0 ? ` · ${pub.tags.join(", ")}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
