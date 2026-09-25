import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { findEditableCourse } from "@/lib/courses";
import { requireUser } from "@/lib/dal";
import { LessonForm } from "../lesson-form";

export const metadata: Metadata = { title: "New lesson" };

export default async function NewLessonPage({ params, searchParams }: PageProps<"/instructor/courses/[courseId]/lessons/new">) {
  const user = await requireUser(["instructor", "admin"]);
  const { courseId } = await params;
  const { section } = await searchParams;

  const course = await findEditableCourse(courseId, user);
  if (!course) notFound();

  const sections = [...course.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s._id.toString(), title: s.title }));
  const defaultSection = sections.find((s) => s.id === section)?.id ?? sections[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/instructor/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>
      <Card className="mt-4 p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">New lesson</h1>
        {sections.length === 0 ? (
          <p className="text-muted-foreground">Add a section to the course first.</p>
        ) : (
          <LessonForm
            courseId={courseId}
            lessonId={null}
            sections={sections}
            values={{
              title: "",
              section: defaultSection,
              type: "video",
              videoUrl: "",
              pdfUrl: "",
              content: "",
              durationMinutes: 0,
              isPreview: false,
            }}
          />
        )}
      </Card>
    </div>
  );
}
