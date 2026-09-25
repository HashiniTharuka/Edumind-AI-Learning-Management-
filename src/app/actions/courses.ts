"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { optionalUrl, toActionError, validationError, type ActionState } from "@/lib/action-state";
import { getEditableCourseOrThrow, isValidId, uniqueCourseSlug } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/models/ChatMessage";
import { ContentChunk } from "@/models/ContentChunk";
import { CATEGORIES, Course, LEVELS } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Lesson } from "@/models/Lesson";
import { Quiz, QuizAttempt } from "@/models/Quiz";
import { Review } from "@/models/Review";

const TEACHERS = ["instructor", "admin"] as const;

const baseCourseSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  subtitle: z.string().trim().max(200).optional(),
  category: z.enum(CATEGORIES),
  level: z.enum(LEVELS),
});

const lines = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max)
    );

const updateCourseSchema = baseCourseSchema.extend({
  description: z.string().trim().max(5000).optional(),
  thumbnailUrl: optionalUrl,
  tags: z
    .string()
    .optional()
    .transform((v) =>
      [...new Set((v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10)
    ),
  whatYouWillLearn: lines(12),
});

function editorPath(courseId: string) {
  return `/instructor/courses/${courseId}`;
}

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let courseId: string;
  try {
    const user = await assertUser([...TEACHERS]);
    const parsed = baseCourseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const course = await Course.create({
      ...parsed.data,
      slug: await uniqueCourseSlug(parsed.data.title),
      instructor: user.id,
      sections: [{ title: "Getting started", order: 0 }],
    });
    courseId = course._id.toString();
  } catch (err) {
    return toActionError(err);
  }
  redirect(editorPath(courseId));
}

export async function updateCourse(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const parsed = updateCourseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    // Keep public URLs stable once a course is live.
    if (course.status === "draft" && parsed.data.title !== course.title) {
      course.slug = await uniqueCourseSlug(parsed.data.title, courseId);
    }
    course.set(parsed.data);
    await course.save();
    revalidatePath(editorPath(courseId));
    return { ok: true, message: "Course details saved" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setCoursePublished(courseId: string, publish: boolean): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);

    if (publish) {
      const problems: string[] = [];
      if ((course.description ?? "").length < 50) problems.push("a description of at least 50 characters");
      if (course.stats.lessonCount < 1) problems.push("at least one lesson");
      if (problems.length) return { error: `Before publishing, add ${problems.join(" and ")}.` };
      course.status = "published";
      course.publishedAt ??= new Date();
    } else {
      course.status = "draft";
    }
    await course.save();
    revalidatePath(editorPath(courseId));
    revalidatePath("/instructor");
    revalidatePath("/admin");
    return { ok: true, message: publish ? "Course published 🎉" : "Course moved back to draft" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCourse(courseId: string, returnTo?: string): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);

    if (user.role !== "admin" && (await Enrollment.exists({ course: course._id }))) {
      return { error: "This course has students enrolled. Unpublish it instead of deleting it." };
    }

    const quizIds = await Quiz.find({ course: course._id }).distinct("_id");
    await Promise.all([
      Lesson.deleteMany({ course: course._id }),
      ContentChunk.deleteMany({ course: course._id }),
      Quiz.deleteMany({ course: course._id }),
      QuizAttempt.deleteMany({ quiz: { $in: quizIds } }),
      Review.deleteMany({ course: course._id }),
      Enrollment.deleteMany({ course: course._id }),
      ChatMessage.deleteMany({ course: course._id }),
    ]);
    await course.deleteOne();
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/instructor");
  revalidatePath("/admin");
  // Only allow known destinations — this argument comes from the client.
  redirect(returnTo === "/admin" ? "/admin" : "/instructor");
}

/* ---------------------------- Sections ---------------------------- */

const sectionTitle = z.object({ title: z.string().trim().min(2, "Section title is too short").max(120) });

export async function addSection(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const parsed = sectionTitle.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const nextOrder = Math.max(-1, ...course.sections.map((s) => s.order)) + 1;
    course.sections.push({ title: parsed.data.title, order: nextOrder });
    await course.save();
    revalidatePath(editorPath(courseId));
    return { ok: true, message: "Section added" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function renameSection(
  courseId: string,
  sectionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const parsed = sectionTitle.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const section = course.sections.id(sectionId);
    if (!section) return { error: "Section not found" };
    section.title = parsed.data.title;
    await course.save();
    revalidatePath(editorPath(courseId));
    return { ok: true, message: "Section renamed" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteSection(courseId: string, sectionId: string): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    if (!isValidId(sectionId) || !course.sections.id(sectionId)) return { error: "Section not found" };
    if (await Lesson.exists({ course: course._id, section: sectionId })) {
      return { error: "Delete or move the lessons in this section first." };
    }
    course.sections.pull({ _id: sectionId });
    await course.save();
    revalidatePath(editorPath(courseId));
    return { ok: true, message: "Section deleted" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function moveSection(courseId: string, sectionId: string, direction: "up" | "down"): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const sorted = [...course.sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s._id.toString() === sectionId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return {};

    // Normalize orders to 0..n-1 then swap, so gaps from deletions never cause ties.
    sorted.forEach((s, i) => (s.order = i));
    [sorted[index].order, sorted[swapWith].order] = [swapWith, index];
    await course.save();
    revalidatePath(editorPath(courseId));
    return {};
  } catch (err) {
    return toActionError(err);
  }
}
