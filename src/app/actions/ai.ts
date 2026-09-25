"use server";

import { revalidatePath } from "next/cache";
import { toActionError, type ActionState } from "@/lib/action-state";
import { AIError, isAIConfigured } from "@/lib/ai/gemini";
import { indexCourse } from "@/lib/ai/rag";
import { getEditableCourseOrThrow, isValidId } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/models/ChatMessage";

export async function buildAIIndex(courseId: string, force = false): Promise<ActionState> {
  try {
    const user = await assertUser(["instructor", "admin"]);
    const course = await getEditableCourseOrThrow(courseId, user);
    if (!isAIConfigured()) return { error: "Add GEMINI_API_KEY to .env.local to enable the AI tutor." };

    const { lessons, chunks } = await indexCourse(course._id, { force: force === true });
    revalidatePath(`/instructor/courses/${courseId}`);
    return {
      ok: true,
      message: lessons ? `Indexed ${lessons} lesson(s) into ${chunks} searchable chunks` : "Everything is already up to date",
    };
  } catch (err) {
    if (err instanceof AIError) return { error: err.message };
    return toActionError(err);
  }
}

export async function clearChatHistory(courseId: string): Promise<ActionState> {
  try {
    const user = await assertUser();
    if (!isValidId(courseId)) return { error: "Course not found" };
    await connectDB();
    await ChatMessage.deleteMany({ user: user.id, course: courseId });
    return { ok: true, message: "Conversation cleared" };
  } catch (err) {
    return toActionError(err);
  }
}
