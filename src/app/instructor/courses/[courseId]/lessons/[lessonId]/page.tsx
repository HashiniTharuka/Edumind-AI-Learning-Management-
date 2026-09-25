import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { findEditableCourse, isValidId } from "@/lib/courses";
import { requireUser } from "@/lib/dal";
import { Lesson } from "@/models/Lesson";
import { LessonForm } from "../lesson-form";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function EditLessonPage({ params }: PageProps<"/instructor/courses/[courseId]/lessons/[lessonId]">) {
  const user = await requireUser(["instructor", "admin"]);
  const { courseId, lessonId } = await params;

  const course = await findEditableCourse(courseId, user);
  if (!course || !isValidId(lessonId)) notFound();

  const lesson = await Lesson.findOne({ _id: lessonId, course: course._id }).lean();
  if (!lesson) notFound();

  const sections = [...course.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s._id.toString(), title: s.title }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/instructor/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>
      <Card className="mt-4 p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">Edit lesson</h1>
        <LessonForm
          courseId={courseId}
          lessonId={lessonId}
          sections={sections}
          values={{
            title: lesson.title,
            section: lesson.section.toString(),
            type: lesson.type,
            videoUrl: lesson.videoUrl ?? "",
            pdfUrl: lesson.pdfUrl ?? "",
            content: lesson.content ?? "",
            durationMinutes: lesson.durationMinutes,
            isPreview: lesson.isPreview,
          }}
        />
      </Card>
    </div>
  );
}
