import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A slice of lesson content plus its embedding vector.
 * Queried with Atlas Vector Search (index "chunk_vector_index", see scripts/setup-indexes.ts)
 * to give the AI tutor course-specific context (RAG).
 */
const contentChunkSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    lessonTitle: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

export type ContentChunkDoc = InferSchemaType<typeof contentChunkSchema>;

export const ContentChunk: Model<ContentChunkDoc> =
  models.ContentChunk || model<ContentChunkDoc>("ContentChunk", contentChunkSchema);
