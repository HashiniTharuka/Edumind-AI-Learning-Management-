import Link from "next/link";
import { Award, BarChart3, Bot, BookOpen, ListChecks, Search } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchCourses, type CatalogCourse } from "@/lib/catalog";

const features = [
  {
    icon: Bot,
    title: "AI tutor per course",
    text: "Ask anything about a course. Answers are grounded in the lesson material with links to the source lessons.",
  },
  {
    icon: ListChecks,
    title: "Auto-generated quizzes",
    text: "Instructors generate quizzes from lesson content in one click. Students get instant feedback and explanations.",
  },
  {
    icon: BarChart3,
    title: "Progress tracking",
    text: "Pick up where you left off. See completion per course and your learning streak on your dashboard.",
  },
  {
    icon: Award,
    title: "Verifiable certificates",
    text: "Finish a course to earn a PDF certificate with a unique verification code.",
  },
  {
    icon: Search,
    title: "Smart search",
    text: "Find courses instantly with typo-tolerant full-text search powered by MongoDB Atlas Search.",
  },
  {
    icon: BookOpen,
    title: "Instructor studio",
    text: "Build courses with sections, video, article and PDF lessons, then publish when you're ready.",
  },
];

async function popularCourses(): Promise<CatalogCourse[]> {
  try {
    return (await searchCourses({ sort: "popular" })).items.slice(0, 4);
  } catch (err) {
    // The landing page should still render if the database is unreachable.
    console.error("popular courses unavailable", err);
    return [];
  }
}

export default async function Home() {
  const popular = await popularCourses();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)]" />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Bot className="size-3.5 text-primary" /> Powered by RAG + MongoDB Atlas Vector Search
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Learn faster with an <span className="text-primary">AI tutor</span> that knows your course
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            EduMind is a learning platform where every course comes with its own AI assistant, auto-generated quizzes,
            progress tracking and certificates.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/courses" className={buttonClass("primary", "lg")}>
              Browse courses
            </Link>
            <Link href="/register?role=instructor" className={buttonClass("outline", "lg")}>
              Teach on EduMind
            </Link>
          </div>
        </div>
      </section>

      {popular.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Popular courses</h2>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <h2 className="text-center text-3xl font-bold">Everything you need to learn and teach</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
