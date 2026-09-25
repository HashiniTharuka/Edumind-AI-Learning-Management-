import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, Star, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, StatCard } from "@/components/ui/card";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { formatDuration, plural } from "@/lib/utils";
import { Course } from "@/models/Course";

export const metadata: Metadata = { title: "Instructor Studio" };

export default async function InstructorPage() {
  const user = await requireUser(["instructor", "admin"]);
  await connectDB();

  const courses = await Course.find({ instructor: user.id })
    .sort({ updatedAt: -1 })
    .select("title slug subtitle status thumbnailUrl stats updatedAt")
    .lean();

  const totalStudents = courses.reduce((sum, c) => sum + c.stats.enrollments, 0);
  const rated = courses.filter((c) => c.stats.ratingCount > 0);
  const avgRating = rated.length ? rated.reduce((s, c) => s + c.stats.ratingAvg, 0) / rated.length : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Instructor Studio</h1>
          <p className="mt-1 text-muted-foreground">Create, edit and publish your courses.</p>
        </div>
        <Link href="/instructor/courses/new" className={buttonClass("primary")}>
          <Plus className="size-4" /> New course
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={courses.length} icon={<BookOpen className="size-4" />} />
        <StatCard label="Total students" value={totalStudents} icon={<Users className="size-4" />} />
        <StatCard label="Average rating" value={avgRating ? avgRating.toFixed(1) : "—"} icon={<Star className="size-4" />} />
      </div>

      {courses.length === 0 ? (
        <Card className="mt-8 p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Create your first course</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add sections and lessons, and EduMind will give your students an AI tutor trained on your content.
          </p>
          <Link href="/instructor/courses/new" className={buttonClass("primary", "md", "mt-6")}>
            <Plus className="size-4" /> New course
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4">
          {courses.map((c) => (
            <Link key={c._id.toString()} href={`/instructor/courses/${c._id}`}>
              <Card className="flex flex-col gap-4 p-4 transition-colors hover:border-primary sm:flex-row sm:items-center">
                <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
                  {c.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnailUrl} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">{c.title}</h2>
                    <Badge tone={c.status === "published" ? "success" : "muted"} className="capitalize">
                      {c.status}
                    </Badge>
                  </div>
                  {c.subtitle && <p className="mt-1 truncate text-sm text-muted-foreground">{c.subtitle}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{plural(c.stats.lessonCount, "lesson")}</span>
                    <span>{formatDuration(c.stats.totalMinutes)}</span>
                    <span>{plural(c.stats.enrollments, "student")}</span>
                    {c.stats.ratingCount > 0 && (
                      <span>
                        ★ {c.stats.ratingAvg.toFixed(1)} ({c.stats.ratingCount})
                      </span>
                    )}
                    <span>Updated {new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
