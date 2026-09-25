import "server-only";
import { connectDB } from "@/lib/db";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";

const CODE_PATTERN = /^EDU-[0-9A-F]{5}-[0-9A-F]{5}$/;

export type Certificate = {
  code: string;
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  instructorName: string;
  completedAt: Date;
  totalMinutes: number;
};

export async function getCertificate(code: string): Promise<Certificate | null> {
  const normalized = code.trim().toUpperCase();
  if (!CODE_PATTERN.test(normalized)) return null;

  await connectDB();
  const enrollment = await Enrollment.findOne({ certificateCode: normalized, completedAt: { $ne: null } }).lean();
  if (!enrollment?.completedAt) return null;

  const [student, course] = await Promise.all([
    User.findById(enrollment.user).select("name").lean(),
    Course.findById(enrollment.course).select("title slug instructor stats").lean(),
  ]);
  if (!student || !course) return null;
  const instructor = await User.findById(course.instructor).select("name").lean();

  return {
    code: normalized,
    studentName: student.name,
    courseTitle: course.title,
    courseSlug: course.slug,
    instructorName: instructor?.name ?? "EduMind",
    completedAt: enrollment.completedAt,
    totalMinutes: course.stats.totalMinutes,
  };
}
