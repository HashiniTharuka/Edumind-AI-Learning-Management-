import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Lock } from "lucide-react";
import { enroll } from "@/app/actions/enrollments";
import { ActionButton } from "@/components/action-button";
import { Markdown } from "@/components/markdown";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isAIConfigured } from "@/lib/ai/gemini";
import { isValidId } from "@/lib/courses";
import { requireUser } from "@/lib/dal";
import { canEditCourse, findEnrollment, getCourseOutline, getViewableCourseBySlug } from "@/lib/learning";
import { getVideoSource } from "@/lib/video";
import { ChatMessage } from "@/models/ChatMessage";
import { Enrollment } from "@/models/Enrollment";
import { Lesson } from "@/models/Lesson";
import { Quiz, QuizAttempt } from "@/models/Quiz";
import { CompleteButton } from "./complete-button";
import { LessonSidebar } from "./lesson-sidebar";
import { LessonTabs } from "./lesson-tabs";
import { QuizPanel } from "./quiz-panel";
import { TutorChat } from "./tutor-chat";

export const metadata: Metadata = { title: "Learning" };

export default async function LessonPage({ params }: PageProps<"/learn/[slug]/[lessonId]">) {
  const { slug, lessonId } = await params;
  const user = await requireUser();
  const course = await getViewableCourseBySlug(slug, user);
  if (!course || !isValidId(lessonId)) notFound();

  const [lesson, enrollment, outline] = await Promise.all([
    Lesson.findOne({ _id: lessonId, course: course._id }).lean(),
    findEnrollment(user.id, course._id),
    getCourseOutline(course),
  ]);
  if (!lesson) notFound();

  const isEditor = canEditCourse(user, course);
  const hasAccess = Boolean(enrollment) || isEditor;
  if (!hasAccess && !lesson.isPreview) redirect(`/courses/${slug}`);

  const courseId = course._id.toString();
  const index = outline.flat.findIndex((l) => l.id === lessonId);
  const prev = outline.flat[index - 1];
  const next = outline.flat[index + 1];
  const completed = new Set(enrollment?.completedLessons.map(String) ?? []);

  const [quiz, chatHistory] = await Promise.all([
    hasAccess ? Quiz.findOne({ lesson: lesson._id }).lean() : null,
    hasAccess
      ? ChatMessage.find({ user: user.id, course: course._id }).sort({ createdAt: -1 }).limit(30).lean()
      : [],
  ]);
  const bestAttempt = quiz
    ? await QuizAttempt.findOne({ user: user.id, quiz: quiz._id }).sort({ score: -1 }).select("score total").lean()
    : null;

  // Remember where the student is, without delaying the page.
  if (enrollment && enrollment.lastLesson?.toString() !== lessonId) {
    after(() => Enrollment.updateOne({ _id: enrollment._id }, { $set: { lastLesson: lesson._id } }, { timestamps: false }));
  }

  const video = lesson.type === "video" ? getVideoSource(lesson.videoUrl) : null;
  const notes = (lesson.content ?? "").trim();

  return (
    <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[320px_1fr]">
      <LessonSidebar
        slug={slug}
        courseTitle={course.title}
        sections={outline.sections}
        currentLessonId={lessonId}
        completed={[...completed]}
        progress={enrollment?.progress ?? 0}
        locked={!hasAccess}
      />

      <div className="min-w-0 px-4 py-6 lg:px-8">
        <Link href={`/courses/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
          <ArrowLeft className="size-4" /> {course.title}
        </Link>

        {!hasAccess && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-accent p-4">
            <span className="flex items-center gap-2 text-sm text-accent-foreground">
              <Lock className="size-4" /> You&apos;re watching a free preview. Enroll to unlock every lesson, quizzes and the AI tutor.
            </span>
            {course.status === "published" && (
              <ActionButton action={enroll.bind(null, courseId)} size="sm" pendingLabel="Enrolling…">
                Enroll for free
              </ActionButton>
            )}
          </Card>
        )}

        {video && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            {video.kind === "youtube" ? (
              <iframe
                src={video.embedUrl}
                title={lesson.title}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={video.src} controls className="size-full" preload="metadata" />
            )}
          </div>
        )}
        {lesson.type === "pdf" && lesson.pdfUrl && (
          <div className="overflow-hidden rounded-xl border">
            <iframe src={lesson.pdfUrl} title={lesson.title} className="h-[70vh] w-full bg-white" />
            <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-t px-4 py-2 text-sm text-primary hover:underline">
              <Download className="size-4" /> Open / download PDF
            </a>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Lesson {index + 1} of {outline.flat.length}
            </p>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
          {enrollment && (
            <CompleteButton
              courseId={courseId}
              lessonId={lessonId}
              completed={completed.has(lessonId)}
              nextHref={next ? `/learn/${slug}/${next.id}` : undefined}
            />
          )}
        </div>

        {lesson.type === "article" ? (
          <Card className="mt-6 p-6 sm:p-8">
            <Markdown>{notes || "_This lesson has no content yet._"}</Markdown>
          </Card>
        ) : null}

        {hasAccess ? (
          <LessonTabs
            className="mt-6"
            notes={lesson.type !== "article" && notes ? <Markdown>{notes}</Markdown> : null}
            quiz={
              quiz ? (
                <QuizPanel
                  key={quiz._id.toString()}
                  quizId={quiz._id.toString()}
                  questions={quiz.questions.map((q) => ({ question: q.question, options: q.options }))}
                  best={bestAttempt ? { score: bestAttempt.score, total: bestAttempt.total } : null}
                />
              ) : null
            }
            tutor={
              <TutorChat
                courseId={courseId}
                lessonId={lessonId}
                enabled={isAIConfigured()}
                initialMessages={chatHistory.reverse().map((m) => ({
                  id: m._id.toString(),
                  role: m.role,
                  content: m.content,
                  sources: (m.sources ?? []).map((s) => ({ lesson: s.lesson?.toString() ?? "", title: s.title ?? "" })),
                }))}
                slug={slug}
              />
            }
          />
        ) : null}

        <nav className="mt-10 flex justify-between gap-4 border-t pt-6">
          {prev ? (
            <Link href={`/learn/${slug}/${prev.id}`} className={buttonClass("outline")}>
              <ChevronLeft className="size-4" /> <span className="max-w-48 truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/learn/${slug}/${next.id}`} className={buttonClass("outline")}>
              <span className="max-w-48 truncate">{next.title}</span> <ChevronRight className="size-4" />
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
