import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LESSON_TYPES } from "@/lib/constants";

export { LESSON_TYPES };

const lessonSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    section: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    order: { type: Number, required: true },
    type: { type: String, enum: LESSON_TYPES, default: "video" },
    videoUrl: { type: String },
    pdfUrl: { type: String },
    // Lesson notes / article body / transcript. This is what the AI tutor learns from.
    content: { type: String, default: "" },
    durationMinutes: { type: Number, default: 0, min: 0 },
    isPreview: { type: Boolean, default: false },
    // Set when the content has been chunked + embedded for the AI tutor.
    indexedAt: { type: Date },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, section: 1, order: 1 });

export type LessonDoc = InferSchemaType<typeof lessonSchema>;

export const Lesson: Model<LessonDoc> = models.Lesson || model<LessonDoc>("Lesson", lessonSchema);
