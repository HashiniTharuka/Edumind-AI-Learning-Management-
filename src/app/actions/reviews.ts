"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError, validationError, type ActionState } from "@/lib/action-state";
import { isValidId } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Review } from "@/models/Review";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(1000).optional(),
});

async function recomputeRating(courseId: Types.ObjectId) {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { course: courseId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Course.updateOne(
    { _id: courseId },
    { $set: { "stats.ratingAvg": Math.round((agg?.avg ?? 0) * 10) / 10, "stats.ratingCount": agg?.count ?? 0 } }
  );
}

export async function submitReview(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    if (!isValidId(courseId)) return { error: "Course not found" };
    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const enrollment = await Enrollment.findOne({ user: user.id, course: courseId }).select("_id");
    if (!enrollment) return { error: "Only enrolled students can review this course." };

    const course = await Course.findById(courseId).select("slug");
    if (!course) return { error: "Course not found" };

    await Review.updateOne(
      { user: user.id, course: course._id },
      { $set: { rating: parsed.data.rating, comment: parsed.data.comment } },
      { upsert: true, runValidators: true }
    );
    await recomputeRating(course._id);
    revalidatePath(`/courses/${course.slug}`);
    return { ok: true, message: "Thanks for your review!" };
  } catch (err) {
    return toActionError(err);
  }
}
