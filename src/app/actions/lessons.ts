"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { optionalUrl, toActionError, validationError, type ActionState } from "@/lib/action-state";
import { getEditableCourseOrThrow, isValidId, recomputeCourseStats } from "@/lib/courses";
import { isAIConfigured } from "@/lib/ai/gemini";
import { indexLesson } from "@/lib/ai/rag";
import { assertUser } from "@/lib/dal";
import { ContentChunk } from "@/models/ContentChunk";
import { Lesson, LESSON_TYPES } from "@/models/Lesson";
import { Quiz, QuizAttempt } from "@/models/Quiz";

const TEACHERS = ["instructor", "admin"] as const;

const lessonSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
    section: z.string().refine(isValidId, "Choose a section"),
    type: z.enum(LESSON_TYPES),
    videoUrl: optionalUrl,
    pdfUrl: optionalUrl,
    content: z.string().max(100_000, "Content is too long (max 100k characters)").default(""),
    durationMinutes: z.coerce.number().int().min(0).max(1000).default(0),
    isPreview: z
      .string()
      .optional()
      .transform((v) => v === "on"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "video" && !data.videoUrl) {
      ctx.addIssue({ code: "custom", path: ["videoUrl"], message: "Add a video URL or upload a video" });
    }
    if (data.type === "pdf" && !data.pdfUrl) {
      ctx.addIssue({ code: "custom", path: ["pdfUrl"], message: "Add a PDF URL or upload a PDF" });
    }
    if (data.type === "article" && data.content.trim().length < 20) {
      ctx.addIssue({ code: "custom", path: ["content"], message: "Write the article content (20+ characters)" });
    }
  });

/** Creates a lesson when lessonId is null, otherwise updates it. */
export async function saveLesson(
  courseId: string,
  lessonId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;

    if (!course.sections.id(data.section)) return { fieldErrors: { section: ["Section not found"] } };

    let needsIndexing = !lessonId;

    if (lessonId) {
      const lesson = await Lesson.findOne({ _id: lessonId, course: course._id });
      if (!lesson) return { error: "Lesson not found" };

      if (lesson.section.toString() !== data.section) {
        lesson.order = await nextLessonOrder(courseId, data.section);
      }
      // Content changed → the AI tutor's index for this lesson is stale.
      if (lesson.content !== data.content || lesson.title !== data.title) {
        lesson.indexedAt = undefined;
        needsIndexing = true;
      }
      lesson.set(data);
      await lesson.save();
      lessonId = lesson._id.toString();
    } else {
      const lesson = await Lesson.create({
        ...data,
        course: course._id,
        order: await nextLessonOrder(courseId, data.section),
      });
      lessonId = lesson._id.toString();
    }

    // Refresh the AI tutor's knowledge in the background, after the response is sent.
    if (needsIndexing && isAIConfigured()) {
      const id = lessonId;
      after(() => indexLesson(id).catch((err) => console.error("indexing failed", err)));
    }

    await recomputeCourseStats(course._id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}?saved=lesson`);
}

async function nextLessonOrder(courseId: string, sectionId: string) {
  const last = await Lesson.findOne({ course: courseId, section: sectionId }).sort({ order: -1 }).select("order").lean();
  return (last?.order ?? -1) + 1;
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    if (!isValidId(lessonId)) return { error: "Lesson not found" };

    const lesson = await Lesson.findOneAndDelete({ _id: lessonId, course: course._id });
    if (!lesson) return { error: "Lesson not found" };

    const quiz = await Quiz.findOneAndDelete({ lesson: lesson._id });
    await Promise.all([
      ContentChunk.deleteMany({ lesson: lesson._id }),
      quiz ? QuizAttempt.deleteMany({ quiz: quiz._id }) : null,
    ]);
    await recomputeCourseStats(course._id);
    revalidatePath(`/instructor/courses/${courseId}`);
    return { ok: true, message: "Lesson deleted" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function moveLesson(courseId: string, lessonId: string, direction: "up" | "down"): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    const lesson = isValidId(lessonId) ? await Lesson.findOne({ _id: lessonId, course: course._id }) : null;
    if (!lesson) return { error: "Lesson not found" };

    const siblings = await Lesson.find({ course: course._id, section: lesson.section }).sort({ order: 1 });
    const index = siblings.findIndex((l) => l._id.equals(lesson._id));
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= siblings.length) return {};

    [siblings[index], siblings[swapWith]] = [siblings[swapWith], siblings[index]];
    await Lesson.bulkWrite(
      siblings.map((l, i) => ({ updateOne: { filter: { _id: l._id }, update: { $set: { order: i } } } }))
    );
    revalidatePath(`/instructor/courses/${courseId}`);
    return {};
  } catch (err) {
    return toActionError(err);
  }
}
