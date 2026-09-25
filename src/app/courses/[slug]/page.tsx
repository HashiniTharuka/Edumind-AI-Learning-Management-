import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Bot, Check, ChevronDown, Clock, FileText, PlayCircle, Star, Type, Users } from "lucide-react";
import { enroll } from "@/app/actions/enrollments";
import { ActionButton } from "@/components/action-button";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { canEditCourse, findEnrollment, getCourseOutline, getViewableCourseBySlug } from "@/lib/learning";
import { formatDuration, plural } from "@/lib/utils";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { ReviewForm } from "./review-form";

const LESSON_ICONS = { video: PlayCircle, article: Type, pdf: FileText } as const;

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getViewableCourseBySlug(slug, await getCurrentUser());
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.subtitle ?? course.description?.slice(0, 160),
    openGraph: course.thumbnailUrl ? { images: [course.thumbnailUrl] } : undefined,
  };
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const course = await getViewableCourseBySlug(slug, user);
  if (!course) notFound();

  const courseId = course._id.toString();
  const [outline, instructor, enrollment, reviews, myReview] = await Promise.all([
    getCourseOutline(course),
    User.findById(course.instructor).select("name bio avatarUrl").lean(),
    user ? findEnrollment(user.id, course._id) : null,
    Review.find({ course: course._id, comment: { $nin: [null, ""] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate<{ user: { name: string } | null }>({ path: "user", select: "name", model: User })
      .lean(),
    user ? Review.findOne({ course: course._id, user: user.id }).lean() : null,
  ]);
  const isEditor = canEditCourse(user, course);

  const cta = enrollment ? (
    <Link href={`/learn/${slug}`} className={buttonClass("primary", "lg", "w-full")}>
      {enrollment.completedAt ? "Review course" : enrollment.progress > 0 ? "Continue learning" : "Start learning"}
    </Link>
  ) : !user ? (
    <Link href={`/login?next=/courses/${slug}`} className={buttonClass("primary", "lg", "w-full")}>
      Sign in to enroll
    </Link>
  ) : course.status === "published" ? (
    <ActionButton action={enroll.bind(null, courseId)} size="lg" className="w-full" pendingLabel="Enrolling…">
      Enroll for free
    </ActionButton>
  ) : null;

  return (
    <div>
      {course.status !== "published" && (
        <div className="bg-amber-500/15 px-4 py-2 text-center text-sm">
          This course is a <strong>draft</strong> — only you can see this page.{" "}
          <Link href={`/instructor/courses/${courseId}`} className="underline">
            Edit course
          </Link>
        </div>
      )}

      <section className="bg-slate-900 text-slate-100">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
          <div>
            <Link href={`/courses?category=${encodeURIComponent(course.category)}`} className="text-sm font-medium text-indigo-300 hover:underline">
              {course.category}
            </Link>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-slate-300">{course.subtitle}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              {course.stats.ratingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <strong className="text-amber-300">{course.stats.ratingAvg.toFixed(1)}</strong> ({plural(course.stats.ratingCount, "rating")})
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-4" /> {plural(course.stats.enrollments, "student")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-4" /> {formatDuration(course.stats.totalMinutes)} · {plural(course.stats.lessonCount, "lesson")}
              </span>
              <Badge className="bg-white/10 capitalize text-slate-100">{course.level}</Badge>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Created by <span className="text-slate-200">{instructor?.name ?? "Unknown"}</span>
            </p>
          </div>

          <Card className="overflow-hidden text-foreground lg:row-span-2 lg:self-start">
            <div className="relative aspect-video bg-gradient-to-br from-primary/40 to-accent">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt="" className="size-full object-cover" />
              ) : (
                <BookOpen className="absolute inset-0 m-auto size-12 text-primary/60" />
              )}
            </div>
            <div className="space-y-4 p-5">
              {enrollment && (
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Your progress</span>
                    <span className="font-medium">{enrollment.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${enrollment.progress}%` }} />
                  </div>
                </div>
              )}
              {cta}
              {isEditor && (
                <Link href={`/instructor/courses/${courseId}`} className={buttonClass("outline", "md", "w-full")}>
                  Edit course
                </Link>
              )}
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Bot className="size-4 text-primary" /> AI tutor trained on this course
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Quizzes with instant feedback
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Certificate of completion
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          {course.whatYouWillLearn.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold">What you&apos;ll learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.whatYouWillLearn.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {item}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <section>
            <h2 className="text-xl font-bold">Course content</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {outline.sections.length} sections · {outline.flat.length} lessons · {formatDuration(course.stats.totalMinutes)} total
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border">
              {outline.sections.map((section, i) => (
                <details key={section.id} open={i === 0} className="group border-b last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between bg-muted/50 px-4 py-3 font-medium">
                    <span>{section.title}</span>
                    <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                      {section.lessons.length} lessons
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul>
                    {section.lessons.map((lesson) => {
                      const Icon = LESSON_ICONS[lesson.type];
                      return (
                        <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1">{lesson.title}</span>
                          {lesson.isPreview && !enrollment && (
                            <Link href={`/learn/${slug}/${lesson.id}`} className="text-primary hover:underline">
                              Preview
                            </Link>
                          )}
                          {lesson.durationMinutes > 0 && (
                            <span className="text-muted-foreground">{lesson.durationMinutes} min</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {course.description && (
            <section>
              <h2 className="text-xl font-bold">Description</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{course.description}</p>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">Instructor</h2>
            <div className="mt-4 flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-xl font-semibold text-accent-foreground">
                {instructor?.name.charAt(0).toUpperCase() ?? "?"}
              </span>
              <div>
                <div className="font-semibold">{instructor?.name ?? "Unknown"}</div>
                {instructor?.bio && <p className="mt-1 text-sm text-muted-foreground">{instructor.bio}</p>}
              </div>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              Student reviews
              {course.stats.ratingCount > 0 && (
                <span className="flex items-center gap-1 text-base font-medium text-muted-foreground">
                  <Star className="size-4 fill-amber-400 text-amber-400" /> {course.stats.ratingAvg.toFixed(1)} · {course.stats.ratingCount}
                </span>
              )}
            </h2>
            {enrollment && (
              <Card className="mt-4 p-5">
                <h3 className="mb-3 font-medium">{myReview ? "Your review" : "Rate this course"}</h3>
                <ReviewForm
                  courseId={courseId}
                  initial={myReview ? { rating: myReview.rating, comment: myReview.comment ?? "" } : undefined}
                />
              </Card>
            )}
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No written reviews yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <li key={r._id.toString()} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.user?.name ?? "Former student"}</span>
                      <span className="flex" aria-label={`${r.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={i < r.rating ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-muted-foreground"} />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
