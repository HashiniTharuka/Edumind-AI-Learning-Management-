// Shared between Mongoose models (server) and forms (client) — keep this file dependency-free.

export const ROLES = ["student", "instructor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export const CATEGORIES = [
  "Web Development",
  "Data Science",
  "AI & Machine Learning",
  "Mobile Development",
  "Cloud & DevOps",
  "Design",
  "Business",
  "Other",
] as const;

export const LESSON_TYPES = ["video", "article", "pdf"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];
