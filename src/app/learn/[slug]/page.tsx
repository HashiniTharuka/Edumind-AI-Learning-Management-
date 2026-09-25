import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { canEditCourse, findEnrollment, getCourseOutline, getViewableCourseBySlug } from "@/lib/learning";

/** /learn/[slug] → resume at the last lesson, else the first unfinished one. */
export default async function LearnCoursePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const course = await getViewableCourseBySlug(slug, user);
  if (!course) notFound();

  const [enrollment, outline] = await Promise.all([findEnrollment(user.id, course._id), getCourseOutline(course)]);
  if (!enrollment && !canEditCourse(user, course)) redirect(`/courses/${slug}`);
  if (outline.flat.length === 0) redirect(`/courses/${slug}`);

  const done = new Set(enrollment?.completedLessons.map(String) ?? []);
  const last = enrollment?.lastLesson?.toString();
  const target =
    outline.flat.find((l) => l.id === last && !done.has(l.id)) ??
    outline.flat.find((l) => !done.has(l.id)) ??
    outline.flat[0];

  redirect(`/learn/${slug}/${target.id}`);
}
