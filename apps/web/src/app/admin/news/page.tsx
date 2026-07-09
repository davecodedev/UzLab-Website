"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface NewsArticle {
  id: string;
  title: string;
  publishedAt: string | null;
}

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      setArticles(await api.get<NewsArticle[]>("/news/admin/all", token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.post(
        "/news",
        { title, summary, bodyText, publishedAt: publishNow ? new Date().toISOString() : undefined },
        token,
      );
      setTitle("");
      setSummary("");
      setBodyText("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">News</h1>

      <form onSubmit={handleCreate} className="mt-6 space-y-3">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
        />
        <input
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          className={inputClass}
        />
        <textarea
          placeholder="Body text"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          required
          rows={4}
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          Publish immediately (otherwise saved as a draft)
        </label>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
        {articles.map((article) => (
          <li key={article.id} className="py-3">
            <p className="font-medium">
              {article.title}{" "}
              {!article.publishedAt && <span className="text-xs text-black/40">(draft)</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
