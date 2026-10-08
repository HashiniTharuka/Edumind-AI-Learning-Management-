"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";

const SUGGESTED_TOPICS = [
  { label: "MongoDB", q: "MongoDB" },
  { label: "JavaScript", q: "JavaScript" },
  { label: "Machine Learning", q: "Machine Learning" },
  { label: "Data Science", category: "Data Science" },
  { label: "Web Development", category: "Web Development" },
];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      router.push("/courses");
      return;
    }
    router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <form onSubmit={handleSubmit} className="relative flex items-center shadow-lg rounded-2xl">
        <Search className="pointer-events-none absolute left-4 size-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics (e.g. MongoDB, JavaScript, Vector Search)..."
          className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-28 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="absolute right-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-95"
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Sparkles className="size-3 text-primary" /> Popular topics:
        </span>
        {SUGGESTED_TOPICS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              if (t.q) router.push(`/courses?q=${encodeURIComponent(t.q)}`);
              else if (t.category) router.push(`/courses?category=${encodeURIComponent(t.category)}`);
            }}
            className="rounded-full border bg-card/60 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
