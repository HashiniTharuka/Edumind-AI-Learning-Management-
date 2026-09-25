import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const questionSchema = new Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answerIndex: { type: Number, required: true },
  explanation: { type: String },
});

const quizSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, unique: true },
    questions: [questionSchema],
    generatedByAI: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const quizAttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    answers: [{ type: Number }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ user: 1, quiz: 1, createdAt: -1 });

export type QuizDoc = InferSchemaType<typeof quizSchema>;
export type QuizAttemptDoc = InferSchemaType<typeof quizAttemptSchema>;

export const Quiz: Model<QuizDoc> = models.Quiz || model<QuizDoc>("Quiz", quizSchema);
export const QuizAttempt: Model<QuizAttemptDoc> =
  models.QuizAttempt || model<QuizAttemptDoc>("QuizAttempt", quizAttemptSchema);
