import Link from "next/link";
import { ArrowDown, ArrowUp, FileText, ListChecks, Pencil, PlayCircle, Plus, Sparkles, Trash2, Type, X } from "lucide-react";
import { deleteSection, moveSection } from "@/app/actions/courses";
import { deleteLesson, moveLesson } from "@/app/actions/lessons";
import { deleteQuiz, generateQuiz } from "@/app/actions/quizzes";
import { ActionButton } from "@/components/action-button";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import type { LessonType } from "@/lib/constants";
import { AddSectionForm, SectionTitle } from "./section-forms";

export type CurriculumSection = {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    type: LessonType;
    durationMinutes: number;
    isPreview: boolean;
    indexed: boolean;
    quizQuestions: number;
  }[];
};

const LESSON_ICONS = { video: PlayCircle, article: Type, pdf: FileText } as const;

type Props = { courseId: string; sections: CurriculumSection[]; aiEnabled: boolean };

export function Curriculum({ courseId, sections, aiEnabled }: Props) {
  return (
    <div className="space-y-4">
      {sections.map((section, sIndex) => (
        <Card key={section.id} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Section {sIndex + 1}</span>
            <SectionTitle courseId={courseId} sectionId={section.id} title={section.title} />
            <div className="ml-auto flex">
              <ActionButton
                action={moveSection.bind(null, courseId, section.id, "up")}
                variant="ghost"
                size="sm"
                disabled={sIndex === 0}
                aria-label="Move section up"
              >
                <ArrowUp className="size-4" />
              </ActionButton>
              <ActionButton
                action={moveSection.bind(null, courseId, section.id, "down")}
                variant="ghost"
                size="sm"
                disabled={sIndex === sections.length - 1}
                aria-label="Move section down"
              >
                <ArrowDown className="size-4" />
              </ActionButton>
              <ActionButton
                action={deleteSection.bind(null, courseId, section.id)}
                variant="ghost"
                size="sm"
                confirm={`Delete section "${section.title}"?`}
                aria-label="Delete section"
              >
                <Trash2 className="size-4 text-destructive" />
              </ActionButton>
            </div>
          </div>

          <ul className="divide-y">
            {section.lessons.map((lesson, lIndex) => {
              const Icon = LESSON_ICONS[lesson.type];
              return (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {lIndex + 1}. {lesson.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{lesson.type}</span>
                      {lesson.durationMinutes > 0 && <span>· {lesson.durationMinutes} min</span>}
                      {lesson.isPreview && <Badge>Free preview</Badge>}
                      {lesson.indexed && (
                        <Badge tone="success">
                          <Sparkles className="mr-1 size-3" /> AI ready
                        </Badge>
                      )}
                      {lesson.quizQuestions > 0 && (
                        <Badge tone="muted">
                          <ListChecks className="mr-1 size-3" /> Quiz · {lesson.quizQuestions}
                          <ActionButton
                            action={deleteQuiz.bind(null, courseId, lesson.id)}
                            variant="ghost"
                            className="ml-1 h-4 px-0.5"
                            confirm="Delete this quiz and its attempts?"
                            aria-label="Delete quiz"
                          >
                            <X className="size-3" />
                          </ActionButton>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    {aiEnabled && (
                      <ActionButton
                        action={generateQuiz.bind(null, courseId, lesson.id)}
                        variant="ghost"
                        size="sm"
                        pendingLabel={<Sparkles className="size-4 animate-pulse text-primary" />}
                        confirm={lesson.quizQuestions ? "Replace the existing quiz with a new AI-generated one?" : undefined}
                        aria-label={lesson.quizQuestions ? "Regenerate quiz with AI" : "Generate quiz with AI"}
                        title={lesson.quizQuestions ? "Regenerate quiz with AI" : "Generate quiz with AI"}
                      >
                        <Sparkles className="size-4 text-primary" />
                      </ActionButton>
                    )}
                    <ActionButton
                      action={moveLesson.bind(null, courseId, lesson.id, "up")}
                      variant="ghost"
                      size="sm"
                      disabled={lIndex === 0}
                      aria-label="Move lesson up"
                    >
                      <ArrowUp className="size-4" />
                    </ActionButton>
                    <ActionButton
                      action={moveLesson.bind(null, courseId, lesson.id, "down")}
                      variant="ghost"
                      size="sm"
                      disabled={lIndex === section.lessons.length - 1}
                      aria-label="Move lesson down"
                    >
                      <ArrowDown className="size-4" />
                    </ActionButton>
                    <Link
                      href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                      className={buttonClass("ghost", "sm")}
                      aria-label="Edit lesson"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <ActionButton
                      action={deleteLesson.bind(null, courseId, lesson.id)}
                      variant="ghost"
                      size="sm"
                      confirm={`Delete lesson "${lesson.title}"?`}
                      aria-label="Delete lesson"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </ActionButton>
                  </div>
                </li>
              );
            })}
            <li className="px-4 py-3">
              <Link
                href={`/instructor/courses/${courseId}/lessons/new?section=${section.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="size-4" /> Add lesson
              </Link>
            </li>
          </ul>
        </Card>
      ))}

      <AddSectionForm courseId={courseId} />
    </div>
  );
}
