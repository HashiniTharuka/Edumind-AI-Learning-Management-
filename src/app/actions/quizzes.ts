"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError, type ActionState } from "@/lib/action-state";
import { AIError, generate, isAIConfigured } from "@/lib/ai/gemini";
import { getEditableCourseOrThrow, isValidId } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { canEditCourse } from "@/lib/learning";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Lesson } from "@/models/Lesson";
import { Quiz, QuizAttempt } from "@/models/Quiz";

const TEACHERS = ["instructor", "admin"] as const;
const QUESTION_COUNT = 5;

const QUIZ_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          answerIndex: { type: "INTEGER" },
          explanation: { type: "STRING" },
        },
        required: ["question", "options", "answerIndex", "explanation"],
      },
    },
  },
  required: ["questions"],
};

// Never trust model output: validate shape and ranges before saving.
const generatedQuizSchema = z.object({
  questions: z
    .array(
      z
        .object({
          question: z.string().trim().min(5).max(500),
          options: z.array(z.string().trim().min(1).max(200)).length(4),
          answerIndex: z.number().int().min(0).max(3),
          explanation: z.string().trim().max(800),
        })
        .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === 4, "Options must be distinct")
    )
    .min(3)
    .max(10),
});

export async function generateQuiz(courseId: string, lessonId: string): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    if (!isAIConfigured()) return { error: "Add GEMINI_API_KEY to .env.local to generate quizzes with AI." };
    if (!isValidId(lessonId)) return { error: "Lesson not found" };

    const lesson = await Lesson.findOne({ _id: lessonId, course: course._id }).select("title content");
    if (!lesson) return { error: "Lesson not found" };
    if ((lesson.content ?? "").trim().length < 200) {
      return { error: "Add at least 200 characters of lesson notes/content so the AI has something to quiz on." };
    }

    const raw = await generate(
      [
        {
          role: "user",
          text: `Create a ${QUESTION_COUNT}-question multiple-choice quiz for the lesson "${lesson.title}".

Rules:
- Test understanding of the lesson content below, not trivia.
- Each question has exactly 4 distinct options and one correct answer (answerIndex 0-3).
- Vary the position of the correct answer.
- The explanation says why the answer is right in 1-2 sentences.

LESSON CONTENT:
${lesson.content!.slice(0, 30_000)}`,
        },
      ],
      { temperature: 0.7, responseSchema: QUIZ_RESPONSE_SCHEMA }
    );

    let data;
    try {
      data = generatedQuizSchema.parse(JSON.parse(raw));
    } catch {
      return { error: "The AI returned an invalid quiz. Please try again." };
    }

    await Quiz.findOneAndUpdate(
      { lesson: lesson._id },
      { $set: { course: course._id, questions: data.questions, generatedByAI: true } },
      { upsert: true }
    );
    revalidatePath(`/instructor/courses/${courseId}`);
    return { ok: true, message: `Quiz generated with ${data.questions.length} questions` };
  } catch (err) {
    if (err instanceof AIError) return { error: err.message };
    return toActionError(err);
  }
}

export async function deleteQuiz(courseId: string, lessonId: string): Promise<ActionState> {
  try {
    const user = await assertUser([...TEACHERS]);
    const course = await getEditableCourseOrThrow(courseId, user);
    if (!isValidId(lessonId)) return { error: "Quiz not found" };
    const quiz = await Quiz.findOneAndDelete({ lesson: lessonId, course: course._id });
    if (quiz) await QuizAttempt.deleteMany({ quiz: quiz._id });
    revalidatePath(`/instructor/courses/${courseId}`);
    return { ok: true, message: "Quiz deleted" };
  } catch (err) {
    return toActionError(err);
  }
}

export type QuizResult = ActionState & {
  score?: number;
  total?: number;
  results?: { correct: boolean; answerIndex: number; explanation?: string }[];
};

const answersSchema = z.array(z.number().int().min(-1).max(3)).max(20);

/** Grades on the server — correct answers are never sent to the browser before submission. */
export async function submitQuiz(quizId: string, answers: number[]): Promise<QuizResult> {
  try {
    const user = await assertUser();
    const parsedAnswers = answersSchema.safeParse(answers);
    if (!isValidId(quizId) || !parsedAnswers.success) return { error: "Invalid submission" };

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return { error: "Quiz not found" };
    const course = await Course.findById(quiz.course).select("instructor").lean();
    const enrolled = await Enrollment.exists({ user: user.id, course: quiz.course });
    if (!enrolled && !(course && canEditCourse(user, course))) return { error: "Enroll in this course to take quizzes." };

    const results = quiz.questions.map((q, i) => ({
      correct: parsedAnswers.data[i] === q.answerIndex,
      answerIndex: q.answerIndex,
      explanation: q.explanation ?? undefined,
    }));
    const score = results.filter((r) => r.correct).length;

    if (enrolled) {
      await QuizAttempt.create({
        user: user.id,
        quiz: quiz._id,
        course: quiz.course,
        answers: parsedAnswers.data,
        score,
        total: results.length,
      });
    }
    return { ok: true, score, total: results.length, results };
  } catch (err) {
    return toActionError(err);
  }
}
