import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, Circle, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { buildAIIndex } from "@/app/actions/ai";
import { deleteCourse, setCoursePublished } from "@/app/actions/courses";
import { ActionButton } from "@/components/action-button";
import { FlashToast } from "@/components/flash-toast";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { isAIConfigured } from "@/lib/ai/gemini";
import { findEditableCourse } from "@/lib/courses";
import { requireUser } from "@/lib/dal";
import { cn, formatDuration, plural } from "@/lib/utils";
import { Lesson } from "@/models/Lesson";
import { Quiz } from "@/models/Quiz";
import { CourseDetailsForm } from "./course-details-form";
import { Curriculum, type CurriculumSection } from "./curriculum";

export const metadata: Metadata = { title: "Edit course" };

const TABS = [
  { id: "curriculum", label: "Curriculum" },
  { id: "details", label: "Details" },
] as const;

export default async function EditCoursePage({ params, searchParams }: PageProps<"/instructor/courses/[courseId]">) {
  const user = await requireUser(["instructor", "admin"]);
  const { courseId } = await params;
  const { tab, saved } = await searchParams;

  const course = await findEditableCourse(courseId, user);
  if (!course) notFound();

  const [lessons, quizzes] = await Promise.all([
    Lesson.find({ course: course._id })
      .sort({ order: 1 })
      .select("title section order type durationMinutes isPreview indexedAt content")
      .lean(),
    Quiz.find({ course: course._id }).select("lesson questions").lean(),
  ]);
  const quizSizes = new Map(quizzes.map((q) => [q.lesson.toString(), q.questions.length]));
  const withContent = lessons.filter((l) => (l.content ?? "").trim().length > 0);
  const indexedCount = withContent.filter((l) => l.indexedAt).length;
  const aiEnabled = isAIConfigured();

  const sections: CurriculumSection[] = [...course.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s._id.toString(),
      title: s.title,
      lessons: lessons
        .filter((l) => l.section.toString() === s._id.toString())
        .map((l) => ({
          id: l._id.toString(),
          title: l.title,
          type: l.type,
          durationMinutes: l.durationMinutes,
          isPreview: l.isPreview,
          indexed: Boolean(l.indexedAt),
          quizQuestions: quizSizes.get(l._id.toString()) ?? 0,
        })),
    }));

  const activeTab = tab === "details" ? "details" : "curriculum";
  const isPublished = course.status === "published";
  const checklist = [
    { done: course.title.length >= 5, label: "Course title" },
    { done: (course.description ?? "").length >= 50, label: "Description (50+ characters)" },
    { done: lessons.length > 0, label: "At least one lesson" },
    { done: Boolean(course.thumbnailUrl), label: "Thumbnail image (recommended)" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <FlashToast message={saved === "lesson" ? "Lesson saved" : undefined} />
      <Link href="/instructor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to studio
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{course.title}</h1>
            <Badge tone={isPublished ? "success" : "muted"} className="capitalize">
              {course.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {plural(lessons.length, "lesson")} · {formatDuration(course.stats.totalMinutes)} · {plural(course.stats.enrollments, "student")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublished && (
            <Link href={`/courses/${course.slug}`} className={buttonClass("outline")}>
              <ExternalLink className="size-4" /> View
            </Link>
          )}
          <ActionButton
            action={setCoursePublished.bind(null, courseId, !isPublished)}
            variant={isPublished ? "outline" : "primary"}
            pendingLabel="Saving…"
          >
            {isPublished ? "Unpublish" : "Publish"}
          </ActionButton>
          <ActionButton
            action={deleteCourse.bind(null, courseId)}
            variant="ghost"
            confirm="Delete this course and all its lessons? This cannot be undone."
            aria-label="Delete course"
            title="Delete course"
          >
            <Trash2 className="size-4 text-destructive" />
          </ActionButton>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <nav className="flex gap-1 border-b">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={`/instructor/courses/${courseId}${t.id === "details" ? "?tab=details" : ""}`}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
                  activeTab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6">
            {activeTab === "curriculum" ? (
              <Curriculum courseId={courseId} sections={sections} aiEnabled={aiEnabled} />
            ) : (
              <CourseDetailsForm
                courseId={courseId}
                course={{
                  title: course.title,
                  subtitle: course.subtitle ?? "",
                  description: course.description ?? "",
                  category: course.category,
                  level: course.level,
                  thumbnailUrl: course.thumbnailUrl ?? "",
                  tags: course.tags.join(", "),
                  whatYouWillLearn: course.whatYouWillLearn.join("\n"),
                }}
              />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Bot className="size-5 text-primary" /> AI tutor
            </h2>
            {aiEnabled ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {indexedCount} of {withContent.length} lessons with notes are indexed. Lessons are indexed
                  automatically when you save them.
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${withContent.length ? (indexedCount / withContent.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton action={buildAIIndex.bind(null, courseId, false)} size="sm" pendingLabel="Indexing…">
                    Index new lessons
                  </ActionButton>
                  <ActionButton
                    action={buildAIIndex.bind(null, courseId, true)}
                    size="sm"
                    variant="outline"
                    pendingLabel="Rebuilding…"
                    title="Re-embed every lesson"
                  >
                    <RefreshCw className="size-3.5" /> Rebuild all
                  </ActionButton>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Add <code className="rounded bg-muted px-1">GEMINI_API_KEY</code> to <code className="rounded bg-muted px-1">.env.local</code> to
                enable the AI tutor and quiz generation.
              </p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Publishing checklist</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Tip: add lesson notes or transcripts — the AI tutor answers students&apos; questions from this text.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
