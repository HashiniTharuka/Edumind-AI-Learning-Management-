import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, course: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;

export const Review: Model<ReviewDoc> = models.Review || model<ReviewDoc>("Review", reviewSchema);
