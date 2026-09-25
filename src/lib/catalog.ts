import "server-only";
import type { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { Course } from "@/models/Course";
import { User } from "@/models/User";

export const SEARCH_INDEX = "course_search";
export const PAGE_SIZE = 12;

export const SORTS = {
  popular: { label: "Most popular", sort: { "stats.enrollments": -1, _id: -1 } },
  rating: { label: "Highest rated", sort: { "stats.ratingAvg": -1, "stats.ratingCount": -1, _id: -1 } },
  newest: { label: "Newest", sort: { publishedAt: -1, _id: -1 } },
} as const;
export type SortKey = keyof typeof SORTS;

export type CatalogQuery = {
  q?: string;
  category?: string;
  level?: string;
  sort?: string;
  page?: number;
};

export type CatalogCourse = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  thumbnailUrl?: string;
  category: string;
  level: string;
  instructorName: string;
  stats: { enrollments: number; ratingAvg: number; ratingCount: number; lessonCount: number; totalMinutes: number };
};

type RawCourse = Omit<CatalogCourse, "id"> & { _id: unknown };

const PROJECT = {
  title: 1,
  slug: 1,
  subtitle: 1,
  thumbnailUrl: 1,
  category: 1,
  level: 1,
  stats: 1,
  instructorName: { $ifNull: [{ $first: "$instructorDoc.name" }, "Unknown"] },
};

function normalize(query: CatalogQuery) {
  return {
    q: query.q?.trim().slice(0, 100) || undefined,
    category: CATEGORIES.find((c) => c === query.category),
    level: LEVELS.find((l) => l === query.level),
    sort: (query.sort && query.sort in SORTS ? query.sort : "popular") as SortKey,
    page: Math.max(1, Math.floor(query.page ?? 1)),
  };
}

function lookupInstructor(): PipelineStage.FacetPipelineStage[] {
  return [
    { $lookup: { from: User.collection.name, localField: "instructor", foreignField: "_id", as: "instructorDoc", pipeline: [{ $project: { name: 1 } }] } },
    { $project: PROJECT },
  ];
}

/**
 * Atlas Search: fuzzy full-text over title/subtitle/tags/description with relevance boosts.
 * Requires the "course_search" index (npm run setup:indexes).
 */
async function atlasSearch(q: string, filters: { category?: string; level?: string }, skip: number) {
  const filter: object[] = [{ equals: { path: "status", value: "published" } }];
  if (filters.category) filter.push({ equals: { path: "category", value: filters.category } });
  if (filters.level) filter.push({ equals: { path: "level", value: filters.level } });

  const [result] = await Course.aggregate<{ items: RawCourse[]; total: { count: number }[] }>([
    {
      $search: {
        index: SEARCH_INDEX,
        compound: {
          filter,
          should: [
            { text: { query: q, path: "title", fuzzy: { maxEdits: 1 }, score: { boost: { value: 5 } } } },
            { text: { query: q, path: "tags", fuzzy: { maxEdits: 1 }, score: { boost: { value: 3 } } } },
            { text: { query: q, path: "subtitle", fuzzy: { maxEdits: 1 }, score: { boost: { value: 2 } } } },
            { text: { query: q, path: "description", fuzzy: { maxEdits: 1 } } },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: PAGE_SIZE }, ...lookupInstructor()],
        total: [{ $count: "count" }],
      },
    },
  ]);
  return { items: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
}

/** Fallback for local MongoDB / before the search index exists: case-insensitive regex. */
async function regexSearch(q: string | undefined, filters: { category?: string; level?: string }, sort: SortKey, skip: number) {
  const match: Record<string, unknown> = { status: "published" };
  if (filters.category) match.category = filters.category;
  if (filters.level) match.level = filters.level;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ title: rx }, { subtitle: rx }, { tags: rx }, { description: rx }];
  }
  const [items, total] = await Promise.all([
    Course.aggregate<RawCourse>([
      { $match: match },
      { $sort: SORTS[sort].sort },
      { $skip: skip },
      { $limit: PAGE_SIZE },
      ...lookupInstructor(),
    ]),
    Course.countDocuments(match),
  ]);
  return { items, total };
}

export async function searchCourses(query: CatalogQuery) {
  const { q, category, level, sort, page } = normalize(query);
  const skip = (page - 1) * PAGE_SIZE;
  await connectDB();

  let result: { items: RawCourse[]; total: number } | null = null;
  let engine: "atlas" | "basic" = "basic";
  if (q) {
    try {
      const atlas = await atlasSearch(q, { category, level }, skip);
      // An Atlas cluster without the index returns no results rather than an error, so try the fallback too.
      if (atlas.total > 0) {
        result = atlas;
        engine = "atlas";
      }
    } catch {
      // Not running on Atlas (e.g. local MongoDB) — fall back below.
    }
  }
  result ??= await regexSearch(q, { category, level }, sort, skip);

  return {
    items: result.items.map(({ _id, ...c }): CatalogCourse => ({ ...c, id: String(_id) })),
    total: result.total,
    page,
    pages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
    params: { q, category, level, sort },
    engine,
  };
}
