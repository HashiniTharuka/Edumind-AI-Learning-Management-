import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const chatMessageSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sources: [
      {
        lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
        title: String,
      },
    ],
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, course: 1, createdAt: 1 });

export type ChatMessageDoc = InferSchemaType<typeof chatMessageSchema>;

export const ChatMessage: Model<ChatMessageDoc> =
  models.ChatMessage || model<ChatMessageDoc>("ChatMessage", chatMessageSchema);
