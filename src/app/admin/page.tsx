import type { Metadata } from "next";
import Link from "next/link";
import { Award, Bot, BookOpen, GraduationCap, Search, Trash2, Users } from "lucide-react";
import { deleteCourse, setCoursePublished } from "@/app/actions/courses";
import { ActionButton } from "@/components/action-button";
import { BarChart } from "@/components/bar-chart";
import { Button } from "@/components/ui/button";
import { Badge, Card, StatCard } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requireUser } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/models/ChatMessage";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";
import { RoleSelect } from "./role-select";

export const metadata: Metadata = { title: "Admin" };

const DAYS = 30;

async function enrollmentsPerDay() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const rows = await Enrollment.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.count]));

  // Fill empty days so the time axis is continuous.
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      shortLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: byDay.get(key) ?? 0,
    };
  });
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireUser(["admin"]);
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  await connectDB();

  const userFilter = query
    ? { $or: ["name", "email"].map((f) => ({ [f]: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })) }
    : {};

  const [roleCounts, courseCounts, enrollmentCount, certificates, aiQuestions, daily, topCourses, users, courses] =
    await Promise.all([
      User.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Course.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Enrollment.estimatedDocumentCount(),
      Enrollment.countDocuments({ completedAt: { $ne: null } }),
      ChatMessage.countDocuments({ role: "user" }),
      enrollmentsPerDay(),
      Course.find({ status: "published" }).sort({ "stats.enrollments": -1 }).limit(5).select("title slug stats").lean(),
      User.find(userFilter).sort({ createdAt: -1 }).limit(50).select("name email role createdAt").lean(),
      Course.find()
        .sort({ updatedAt: -1 })
        .limit(50)
        .populate<{ instructor: { name: string } | null }>({ path: "instructor", select: "name", model: User })
        .select("title slug status stats instructor updatedAt")
        .lean(),
    ]);

  const roles = Object.fromEntries(roleCounts.map((r) => [r._id, r.count]));
  const statuses = Object.fromEntries(courseCounts.map((c) => [c._id, c.count]));
  const totalUsers = roleCounts.reduce((s, r) => s + r.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and moderation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={totalUsers} icon={<Users className="size-4" />} />
        <StatCard
          label="Courses"
          value={
            <span>
              {statuses.published ?? 0}
              <span className="text-sm font-normal text-muted-foreground"> live · {statuses.draft ?? 0} draft</span>
            </span>
          }
          icon={<BookOpen className="size-4" />}
        />
        <StatCard label="Enrollments" value={enrollmentCount} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Certificates issued" value={certificates} icon={<Award className="size-4" />} />
        <StatCard label="AI tutor questions" value={aiQuestions} icon={<Bot className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <BarChart data={daily} unit="enrollments" title={`New enrollments · last ${DAYS} days`} />
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Top courses</h2>
          {topCourses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No published courses yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topCourses.map((c, i) => (
                <li key={c._id.toString()} className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  <Link href={`/courses/${c.slug}`} className="flex-1 truncate hover:text-primary">
                    {c.title}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">{c.stats.enrollments}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 text-center text-sm">
            {(["student", "instructor", "admin"] as const).map((r) => (
              <div key={r}>
                <div className="text-lg font-semibold">{roles[r] ?? 0}</div>
                <div className="capitalize text-muted-foreground">{r}s</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="font-semibold">Users</h2>
          <form action="/admin" className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search name or email" className="h-9 w-56" aria-label="Search users" />
            <Button type="submit" variant="outline" size="sm" aria-label="Search">
              <Search className="size-4" />
            </Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id.toString()} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <RoleSelect userId={u._id.toString()} role={u.role} disabled={u._id.toString() === admin.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users found.</p>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b p-4 font-semibold">Courses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Instructor</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Students</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const id = c._id.toString();
                return (
                  <tr key={id} className="border-t">
                    <td className="max-w-xs truncate px-4 py-2 font-medium">
                      <Link href={`/instructor/courses/${id}`} className="hover:text-primary">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.instructor?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Badge tone={c.status === "published" ? "success" : "muted"} className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.stats.enrollments}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <ActionButton
                          action={setCoursePublished.bind(null, id, c.status !== "published")}
                          variant="outline"
                          size="sm"
                        >
                          {c.status === "published" ? "Unpublish" : "Publish"}
                        </ActionButton>
                        <ActionButton
                          action={deleteCourse.bind(null, id, "/admin")}
                          variant="ghost"
                          size="sm"
                          confirm={`Permanently delete "${c.title}" including enrollments and reviews?`}
                          aria-label="Delete course"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {courses.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No courses yet.</p>}
        </div>
      </Card>
    </div>
  );
}
