import "server-only";
import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import type { CurrentUser } from "@/lib/dal";
import type { LessonType } from "@/lib/constants";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Lesson } from "@/models/Lesson";

export type OutlineLesson = {
  id: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isPreview: boolean;
};
export type OutlineSection = { id: string; title: string; lessons: OutlineLesson[] };

export function canEditCourse(user: CurrentUser | null, course: { instructor: Types.ObjectId }) {
  return !!user && (user.role === "admin" || course.instructor.toString() === user.id);
}

/** Published courses are public; drafts are only visible to their instructor and admins. */
export async function getViewableCourseBySlug(slug: string, user: CurrentUser | null) {
  await connectDB();
  const course = await Course.findOne({ slug }).lean();
  if (!course) return null;
  if (course.status !== "published" && !canEditCourse(user, course)) return null;
  return course;
}

/** Sections in order, each with its lessons in order. Never includes lesson content. */
export async function getCourseOutline(course: { _id: Types.ObjectId; sections: { _id: Types.ObjectId; title: string; order: number }[] }) {
  const lessons = await Lesson.find({ course: course._id })
    .sort({ order: 1 })
    .select("title section type durationMinutes isPreview")
    .lean();

  const sections: OutlineSection[] = [...course.sections]
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
        })),
    }))
    .filter((s) => s.lessons.length > 0);

  return { sections, flat: sections.flatMap((s) => s.lessons) };
}

export async function findEnrollment(userId: string, courseId: Types.ObjectId | string) {
  await connectDB();
  return Enrollment.findOne({ user: userId, course: courseId }).lean();
}

function newCertificateCode() {
  const hex = randomBytes(5).toString("hex").toUpperCase();
  return `EDU-${hex.slice(0, 5)}-${hex.slice(5)}`;
}

/**
 * Recalculates progress from the lessons that still exist in the course, and marks the
 * course complete (issuing a certificate code) the first time progress reaches 100%.
 */
export async function recomputeProgress(enrollmentId: Types.ObjectId, courseId: Types.ObjectId) {
  const [enrollment, lessonIds] = await Promise.all([
    Enrollment.findById(enrollmentId),
    Lesson.find({ course: courseId }).distinct("_id"),
  ]);
  if (!enrollment) return null;

  const existing = new Set(lessonIds.map(String));
  const done = enrollment.completedLessons.filter((id) => existing.has(id.toString())).length;
  enrollment.progress = existing.size ? Math.round((done / existing.size) * 100) : 0;

  let justCompleted = false;
  if (enrollment.progress === 100 && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
    enrollment.certificateCode = newCertificateCode();
    justCompleted = true;
  }
  await enrollment.save();
  return { progress: enrollment.progress, justCompleted, certificateCode: enrollment.certificateCode ?? undefined };
}
