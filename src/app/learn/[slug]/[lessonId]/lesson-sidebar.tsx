import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Circle, FileText, Lock, PlayCircle, Type } from "lucide-react";
import type { OutlineSection } from "@/lib/learning";
import { cn } from "@/lib/utils";

const LESSON_ICONS = { video: PlayCircle, article: Type, pdf: FileText } as const;

type Props = {
  slug: string;
  courseTitle: string;
  sections: OutlineSection[];
  currentLessonId: string;
  completed: string[];
  progress: number;
  locked: boolean;
};

export function LessonSidebar({ slug, courseTitle, sections, currentLessonId, completed, progress, locked }: Props) {
  const done = new Set(completed);

  const list = (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id}>
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h3>
          <ul className="mt-1">
            {section.lessons.map((lesson) => {
              const Icon = LESSON_ICONS[lesson.type];
              const active = lesson.id === currentLessonId;
              const available = !locked || lesson.isPreview;
              const content = (
                <>
                  {done.has(lesson.id) ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Completed" />
                  ) : available ? (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-left">{lesson.title}</span>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              );
              const cls = cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                active ? "bg-accent font-medium text-accent-foreground" : available ? "hover:bg-muted" : "opacity-60"
              );
              return (
                <li key={lesson.id}>
                  {available ? (
                    <Link href={`/learn/${slug}/${lesson.id}`} className={cls} aria-current={active ? "page" : undefined}>
                      {content}
                    </Link>
                  ) : (
                    <span className={cls}>{content}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <aside className="border-b bg-card lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b p-4">
        <Link href={`/courses/${slug}`} className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground lg:inline-flex">
          <ArrowLeft className="size-3.5" /> Course page
        </Link>
        <h2 className="mt-1 font-semibold leading-snug">{courseTitle}</h2>
        {!locked && (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              {progress === 100 && (
                <span className="flex items-center gap-1 font-semibold text-success">
                  <Award className="size-3.5" /> Certified
                </span>
              )}
            </div>
          </>
        )}
      </div>
      {/* Collapsible on mobile, always open on desktop. */}
      <details className="group p-3 lg:hidden">
        <summary className="cursor-pointer px-2 text-sm font-medium">Course content</summary>
        <div className="mt-3">{list}</div>
      </details>
      <div className="hidden p-3 lg:block">{list}</div>
    </aside>
  );
}
