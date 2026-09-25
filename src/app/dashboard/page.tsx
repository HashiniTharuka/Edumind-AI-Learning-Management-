import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Presentation, Shield } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";

export const metadata: Metadata = { title: "Dashboard" };

type EnrolledCourse = {
  id: string;
  progress: number;
  completedAt?: Date | null;
  certificateCode?: string | null;
  course: { title: string; slug: string; thumbnailUrl?: string | null };
};

export default async function DashboardPage() {
  const user = await requireUser();
  await connectDB();

  const enrollments = await Enrollment.find({ user: user.id })
    .sort({ updatedAt: -1 })
    .populate<{ course: EnrolledCourse["course"] }>({ path: "course", select: "title slug thumbnailUrl", model: Course })
    .lean();

  const items: EnrolledCourse[] = enrollments
    .filter((e) => e.course)
    .map((e) => ({
      id: e._id.toString(),
      progress: e.progress,
      completedAt: e.completedAt,
      certificateCode: e.certificateCode,
      course: e.course,
    }));

  const completed = items.filter((e) => e.completedAt).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Hi, {user.name.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-muted-foreground">Here&apos;s what&apos;s happening with your learning.</p>

      {user.role !== "student" && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Presentation className="size-6 text-primary" />
              <div>
                <div className="font-semibold">Instructor Studio</div>
                <div className="text-sm text-muted-foreground">Create and manage your courses</div>
              </div>
            </div>
            <Link href="/instructor" className={buttonClass("primary", "sm")}>
              Open
            </Link>
          </Card>
          {user.role === "admin" && (
            <Card className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <Shield className="size-6 text-primary" />
                <div>
                  <div className="font-semibold">Admin panel</div>
                  <div className="text-sm text-muted-foreground">Users, courses and platform stats</div>
                </div>
              </div>
              <Link href="/admin" className={buttonClass("primary", "sm")}>
                Open
              </Link>
            </Card>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled courses" value={items.length} icon={<BookOpen className="size-4" />} />
        <StatCard label="In progress" value={items.length - completed} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Certificates" value={completed} icon={<Award className="size-4" />} />
      </div>

      <h2 className="mt-12 text-xl font-semibold">My learning</h2>
      {items.length === 0 ? (
        <Card className="mt-4 p-10 text-center">
          <p className="text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
          <Link href="/courses" className={buttonClass("primary", "md", "mt-4")}>
            Browse courses
          </Link>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {e.course.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.course.thumbnailUrl} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 font-semibold">{e.course.title}</h3>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${e.progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  {e.certificateCode ? (
                    <Link href={`/certificates/${e.certificateCode}`} className="flex items-center gap-1 text-success hover:underline">
                      <Award className="size-4" /> Certificate
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{e.progress}% complete</span>
                  )}
                  <Link href={`/learn/${e.course.slug}`} className="font-medium text-primary hover:underline">
                    {e.completedAt ? "Review" : "Continue"}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
