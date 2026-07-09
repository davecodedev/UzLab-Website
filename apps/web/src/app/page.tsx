import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { EmptyStateSection } from "@/components/EmptyStateSection";
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

const QUICK_LINKS = [
  {
    href: "/membership",
    label: "Membership",
    description: "Explore membership types and apply online.",
    icon: (
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
  },
  {
    href: "/publications",
    label: "Publications",
    description: "Cookbook, legislative acts, and international literature.",
    icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />,
  },
  {
    href: "/professional-development",
    label: "Professional Development",
    description: "Courses, workshops, and seminars.",
    icon: <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Zm4 2v5c0 1 3 3 6 3s6-2 6-3v-5" />,
  },
  {
    href: "/career",
    label: "Career",
    description: "Job listings for seekers and employers.",
    icon: <path d="M20 7h-9M14 17H5M17 4v6M7 14v6" />,
  },
];

export default async function Home() {
  const latestNews = await getLatestNews();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-surface px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--accent) 0%, transparent 40%), radial-gradient(circle at 80% 0%, var(--accent) 0%, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Uz<span className="text-accent">Lab</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            The official digital platform of our professional association — membership,
            technical resources, and industry publications in one place.
          </p>
          <div className="mx-auto mt-8 max-w-lg">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/membership/apply"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Become a member
            </Link>
            <Link
              href="/publications"
              className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-background"
            >
              Browse publications
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-border p-5 transition-colors hover:border-accent hover:bg-surface"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="text-accent"
              >
                {item.icon}
              </svg>
              <h3 className="mt-3 font-medium">{item.label}</h3>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="text-xl font-semibold">Our mission</h2>
        <p className="mt-3 text-muted">
          UzLab exists to support and represent our members through professional development,
          shared technical resources, and industry advocacy.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest news</h2>
          <Link href="/news" className="text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        {latestNews.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No news published yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {latestNews.map((article) => (
              <li key={article.id} className="border-b border-border pb-4">
                <Link href={`/news/${article.slug}`} className="font-medium hover:text-accent">
                  {article.title}
                </Link>
                <p className="mt-1 text-sm text-muted">{article.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <EmptyStateSection
          title="Upcoming events"
          emptyMessage="No upcoming events scheduled yet."
        />
      </section>
    </div>
  );
}
