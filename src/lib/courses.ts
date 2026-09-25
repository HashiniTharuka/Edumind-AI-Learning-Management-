import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { AuthError, type CurrentUser } from "@/lib/dal";
import { Course } from "@/models/Course";
import { Lesson } from "@/models/Lesson";
import { slugify } from "@/lib/utils";

export function isValidId(id: string) {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

/** Loads a course the user is allowed to edit (its instructor, or any admin). Returns null otherwise. */
export async function findEditableCourse(courseId: string, user: CurrentUser) {
  if (!isValidId(courseId)) return null;
  await connectDB();
  const course = await Course.findById(courseId);
  if (!course) return null;
  if (user.role !== "admin" && course.instructor.toString() !== user.id) return null;
  return course;
}

/** Same as findEditableCourse but throws — for server actions. */
export async function getEditableCourseOrThrow(courseId: string, user: CurrentUser) {
  const course = await findEditableCourse(courseId, user);
  if (!course) throw new AuthError("Course not found or you don't have access to it.");
  return course;
}

/** Recalculates the denormalized lesson counters on a course. */
export async function recomputeCourseStats(courseId: Types.ObjectId | string) {
  const id = new Types.ObjectId(String(courseId));
  const [agg] = await Lesson.aggregate<{ count: number; minutes: number }>([
    { $match: { course: id } },
    { $group: { _id: null, count: { $sum: 1 }, minutes: { $sum: "$durationMinutes" } } },
  ]);
  await Course.updateOne(
    { _id: id },
    { $set: { "stats.lessonCount": agg?.count ?? 0, "stats.totalMinutes": agg?.minutes ?? 0 } }
  );
}

/** Generates a URL slug that doesn't collide with another course. */
export async function uniqueCourseSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "course";
  let slug = base;
  for (let i = 2; await Course.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}
