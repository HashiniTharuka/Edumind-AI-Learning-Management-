import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CATEGORIES, LEVELS } from "@/lib/constants";

export { CATEGORIES, LEVELS };

const sectionSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  order: { type: Number, required: true },
});

const statsSchema = new Schema(
  {
    enrollments: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    lessonCount: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    subtitle: { type: String, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: CATEGORIES, default: "Other", index: true },
    level: { type: String, enum: LEVELS, default: "beginner" },
    thumbnailUrl: { type: String },
    tags: [{ type: String, trim: true, lowercase: true }],
    whatYouWillLearn: [{ type: String, trim: true }],
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    sections: [sectionSchema],
    // Denormalized counters so catalog pages don't need extra aggregations.
    stats: { type: statsSchema, required: true, default: () => ({}) },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export type CourseDoc = InferSchemaType<typeof courseSchema>;

export const Course: Model<CourseDoc> = models.Course || model<CourseDoc>("Course", courseSchema);
