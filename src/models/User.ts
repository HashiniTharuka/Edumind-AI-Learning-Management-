import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES, type Role } from "@/lib/constants";

export { ROLES, type Role };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "student", index: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", userSchema);
