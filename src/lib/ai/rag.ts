import "server-only";
import { Types } from "mongoose";
import { chunkText, cosineSimilarity } from "@/lib/ai/chunk";
import { embedQuery, embedTexts } from "@/lib/ai/gemini";
import { connectDB } from "@/lib/db";
import { ContentChunk } from "@/models/ContentChunk";
import { Lesson } from "@/models/Lesson";

export const VECTOR_INDEX = "chunk_vector_index";

/** (Re)builds the chunks + embeddings for one lesson. Returns the number of chunks stored. */
export async function indexLesson(lessonId: Types.ObjectId | string) {
  await connectDB();
  const lesson = await Lesson.findById(lessonId).select("course title content updatedAt");
  if (!lesson) return 0;

  const chunks = chunkText(lesson.content ?? "");
  // Prefix each chunk with the lesson title so retrieval matches on topic, not just body text.
  const vectors = chunks.length ? await embedTexts(chunks.map((c) => `Lesson: ${lesson.title}\n\n${c}`), "RETRIEVAL_DOCUMENT") : [];

  await ContentChunk.deleteMany({ lesson: lesson._id });
  if (chunks.length) {
    await ContentChunk.insertMany(
      chunks.map((text, i) => ({
        course: lesson.course,
        lesson: lesson._id,
        lessonTitle: lesson.title,
        chunkIndex: i,
        text,
        embedding: vectors[i],
      }))
    );
  }
  // Skip timestamps so indexing doesn't look like an edit.
  await Lesson.updateOne(
    { _id: lesson._id },
    chunks.length ? { $set: { indexedAt: new Date() } } : { $unset: { indexedAt: 1 } },
    { timestamps: false }
  );
  return chunks.length;
}

/** Indexes every lesson in a course that has changed since it was last indexed. */
export async function indexCourse(courseId: Types.ObjectId | string, { force = false } = {}) {
  await connectDB();
  const filter = force
    ? { course: courseId }
    : { course: courseId, indexedAt: { $exists: false }, content: { $nin: [null, ""] } };
  const lessons = await Lesson.find(filter).select("_id");
  let chunks = 0;
  for (const lesson of lessons) chunks += await indexLesson(lesson._id);
  return { lessons: lessons.length, chunks };
}

export type RetrievedChunk = { lesson: string; lessonTitle: string; text: string; score: number };

/**
 * Finds the course content most relevant to a question.
 * Uses Atlas Vector Search when available; otherwise (local MongoDB, index still building)
 * falls back to exact cosine similarity in app code, which is fine for a single course.
 */
export async function retrieve(courseId: string, question: string, k = 5): Promise<RetrievedChunk[]> {
  await connectDB();
  const queryVector = await embedQuery(question);
  const course = new Types.ObjectId(courseId);

  try {
    const hits = await ContentChunk.aggregate<RetrievedChunk>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: k * 20,
          limit: k,
          filter: { course },
        },
      },
      { $project: { _id: 0, lesson: { $toString: "$lesson" }, lessonTitle: 1, text: 1, score: { $meta: "vectorSearchScore" } } },
    ]);
    if (hits.length) return hits;
  } catch {
    // $vectorSearch is Atlas-only — use the fallback.
  }

  const chunks = await ContentChunk.find({ course }).select("lesson lessonTitle text embedding").lean();
  return chunks
    .map((c) => ({
      lesson: c.lesson.toString(),
      lessonTitle: c.lessonTitle,
      text: c.text,
      score: cosineSimilarity(queryVector, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
