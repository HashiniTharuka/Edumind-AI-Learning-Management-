"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toActionError, type ActionState } from "@/lib/action-state";
import { isValidId } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { recomputeProgress } from "@/lib/learning";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Lesson } from "@/models/Lesson";

export async function enroll(courseId: string): Promise<ActionState> {
  let slug: string;
  try {
    const user = await assertUser();
    if (!isValidId(courseId)) return { error: "Course not found" };
    await connectDB();
    const course = await Course.findOne({ _id: courseId, status: "published" }).select("slug");
    if (!course) return { error: "This course isn't available." };

    // Upsert keeps enrolling idempotent (double clicks, retries) thanks to the unique {user, course} index.
    const res = await Enrollment.updateOne(
      { user: user.id, course: course._id },
      { $setOnInsert: { user: user.id, course: course._id } },
      { upsert: true }
    );
    if (res.upsertedCount) {
      await Course.updateOne({ _id: course._id }, { $inc: { "stats.enrollments": 1 } });
    }
    slug = course.slug;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/courses/${slug}`);
  redirect(`/learn/${slug}`);
}

export type CompletionResult = ActionState & { progress?: number; certificateCode?: string; justCompleted?: boolean };

export async function setLessonComplete(courseId: string, lessonId: string, completed: boolean): Promise<CompletionResult> {
  try {
    const user = await assertUser();
    if (!isValidId(courseId) || !isValidId(lessonId)) return { error: "Lesson not found" };
    await connectDB();

    const lesson = await Lesson.exists({ _id: lessonId, course: courseId });
    if (!lesson) return { error: "Lesson not found" };

    const enrollment = await Enrollment.findOneAndUpdate(
      { user: user.id, course: courseId },
      completed
        ? { $addToSet: { completedLessons: lesson._id }, $set: { lastLesson: lesson._id } }
        : { $pull: { completedLessons: lesson._id } },
      { returnDocument: "after" }
    );
    if (!enrollment) return { error: "Enroll in this course to track progress." };

    const result = await recomputeProgress(enrollment._id, enrollment.course);
    const course = await Course.findById(courseId).select("slug").lean();
    if (course) revalidatePath(`/learn/${course.slug}`, "layout");
    revalidatePath("/dashboard");

    return {
      ok: true,
      progress: result?.progress,
      justCompleted: result?.justCompleted,
      certificateCode: result?.certificateCode,
    };
  } catch (err) {
    return toActionError(err);
  }
}
