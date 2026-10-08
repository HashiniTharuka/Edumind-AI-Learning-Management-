/**
 * Seeds demo users and courses. Safe to re-run: existing demo users/courses are left untouched.
 *   npm run seed            → users + courses (+ AI index if GEMINI_API_KEY is set)
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { isAIConfigured } from "../src/lib/ai/gemini";
import { indexCourse } from "../src/lib/ai/rag";
import { slugify } from "../src/lib/utils";
import { Course } from "../src/models/Course";
import { Enrollment } from "../src/models/Enrollment";
import { Lesson } from "../src/models/Lesson";
import { Quiz } from "../src/models/Quiz";
import { Review } from "../src/models/Review";
import { User } from "../src/models/User";
import { courses } from "./seed-data";

const DEMO_USERS = [
  { name: "Admin User", email: "admin@edumind.dev", password: "Admin12345", role: "admin" },
  {
    name: "Dr. Maya Fernando",
    email: "instructor@edumind.dev",
    password: "Teach12345",
    role: "instructor",
    bio: "Software engineer and educator. 10 years building data-intensive applications with MongoDB and Node.js.",
  },
  { name: "Sam Perera", email: "student@edumind.dev", password: "Learn12345", role: "student" },
] as const;

async function upsertUser(u: (typeof DEMO_USERS)[number]) {
  const existing = await User.findOne({ email: u.email });
  if (existing) return existing;
  return User.create({
    name: u.name,
    email: u.email,
    role: u.role,
    bio: "bio" in u ? u.bio : undefined,
    passwordHash: await bcrypt.hash(u.password, 12),
  });
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed demo accounts in production. Pass --force if you really mean it.");
  }
  let uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<user>")) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log(`• Seed using in-memory MongoDB: ${uri}`);
  }
  await mongoose.connect(uri, { dbName: "edumind" });

  const [, instructor, student] = await Promise.all(DEMO_USERS.map(upsertUser));
  console.log("• Demo users ready");

  const created: mongoose.Types.ObjectId[] = [];
  for (const data of courses) {
    const slug = slugify(data.title);
    if (await Course.exists({ slug })) {
      console.log(`• Skipping existing course: ${data.title}`);
      continue;
    }

    const course = await Course.create({
      title: data.title,
      slug,
      subtitle: data.subtitle,
      description: data.description,
      category: data.category,
      level: data.level,
      tags: data.tags,
      whatYouWillLearn: data.whatYouWillLearn,
      instructor: instructor._id,
      status: "published",
      publishedAt: new Date(),
      sections: data.sections.map((s, i) => ({ title: s.title, order: i })),
    });

    let totalMinutes = 0;
    let lessonCount = 0;
    for (const [si, section] of data.sections.entries()) {
      for (const [li, l] of section.lessons.entries()) {
        const lesson = await Lesson.create({
          course: course._id,
          section: course.sections[si]._id,
          title: l.title,
          order: li,
          type: "article",
          content: l.content,
          durationMinutes: l.minutes,
          isPreview: l.preview ?? false,
        });
        if (l.quiz) await Quiz.create({ course: course._id, lesson: lesson._id, questions: l.quiz, generatedByAI: false });
        totalMinutes += l.minutes;
        lessonCount++;
      }
    }
    course.stats.lessonCount = lessonCount;
    course.stats.totalMinutes = totalMinutes;
    await course.save();
    created.push(course._id);
    console.log(`• Created course: ${data.title} (${lessonCount} lessons)`);
  }

  // Give the demo student some activity so dashboards and reviews aren't empty.
  const first = await Course.findOne({ slug: slugify(courses[0].title) });
  if (first && !(await Enrollment.exists({ user: student._id, course: first._id }))) {
    const firstLesson = await Lesson.findOne({ course: first._id }).sort({ order: 1 });
    await Enrollment.create({
      user: student._id,
      course: first._id,
      completedLessons: firstLesson ? [firstLesson._id] : [],
      lastLesson: firstLesson?._id,
      progress: Math.round(100 / Math.max(1, first.stats.lessonCount)),
    });
    await Review.create({
      user: student._id,
      course: first._id,
      rating: 5,
      comment: "Clear explanations, and the AI tutor answered every question I had about indexes!",
    });
    first.stats.enrollments = 1;
    first.stats.ratingAvg = 5;
    first.stats.ratingCount = 1;
    await first.save();
    console.log("• Enrolled demo student with a review");
  }

  if (isAIConfigured() && created.length) {
    console.log("• Building AI tutor index (Gemini embeddings)…");
    for (const id of created) {
      const { lessons, chunks } = await indexCourse(id);
      console.log(`  ${lessons} lessons → ${chunks} chunks`);
    }
  } else if (!isAIConfigured()) {
    console.log("• GEMINI_API_KEY not set — skipped AI indexing (use \"Index new lessons\" in the Studio later).");
  }

  console.log("\nDemo accounts:");
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(24)} ${u.password}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
