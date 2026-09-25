import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { searchCourses, SORTS } from "@/lib/catalog";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Browse courses",
  description: "Find a course and learn with your own AI tutor.",
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const { items, total, page, pages, params, engine } = await searchCourses({
    q: first(sp.q),
    category: first(sp.category),
    level: first(sp.level),
    sort: first(sp.sort),
    page: Number(first(sp.page)) || 1,
  });

  const hrefFor = (overrides: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, page: undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") next.set(k, String(v));
    const qs = next.toString();
    return qs ? `/courses?${qs}` : "/courses";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Explore courses</h1>
      <p className="mt-1 text-muted-foreground">Every course includes an AI tutor trained on its lessons.</p>

      {/* Plain GET form: works without JavaScript and keeps results shareable via the URL. */}
      <form action="/courses" className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_160px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q} placeholder="Search courses, topics, tags…" className="pl-9" aria-label="Search" />
        </div>
        <Select name="category" defaultValue={params.category ?? ""} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select name="level" defaultValue={params.level ?? ""} aria-label="Level" className="capitalize">
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select name="sort" defaultValue={params.sort} aria-label="Sort by">
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {total} {total === 1 ? "course" : "courses"}
          {params.q && (
            <>
              {" "}
              for “<span className="text-foreground">{params.q}</span>”
            </>
          )}
        </span>
        {engine === "atlas" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
            <Sparkles className="size-3" /> Atlas Search
          </span>
        )}
        {(params.q || params.category || params.level) && (
          <Link href="/courses" className="text-primary hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="mt-6 p-12 text-center text-muted-foreground">
          No courses found. Try a different search or clear the filters.
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex justify-center gap-1" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={hrefFor({ page: p })}
              aria-current={p === page ? "page" : undefined}
              className={cn(buttonClass(p === page ? "primary" : "outline", "sm"), "min-w-9")}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
