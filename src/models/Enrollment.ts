import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const enrollmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    lastLesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date },
    certificateCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export type EnrollmentDoc = InferSchemaType<typeof enrollmentSchema>;

export const Enrollment: Model<EnrollmentDoc> =
  models.Enrollment || model<EnrollmentDoc>("Enrollment", enrollmentSchema);
