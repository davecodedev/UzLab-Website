"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className="flex items-center gap-2 rounded-full border border-border bg-background p-1.5 shadow-lg shadow-accent/5 transition-shadow focus-within:border-accent focus-within:shadow-accent/10"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="ml-3 shrink-0 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search publications, news, members…"
        className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
