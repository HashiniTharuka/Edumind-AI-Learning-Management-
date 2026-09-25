"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FileText, PlayCircle, Sparkles, Type } from "lucide-react";
import { saveLesson } from "@/app/actions/lessons";
import { FileUpload } from "@/components/file-upload";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { LessonType } from "@/lib/constants";
import { submitWithoutReset } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { getVideoSource } from "@/lib/video";

export type LessonFormValues = {
  title: string;
  section: string;
  type: LessonType;
  videoUrl: string;
  pdfUrl: string;
  content: string;
  durationMinutes: number;
  isPreview: boolean;
};

const TYPES = [
  { value: "video", label: "Video", icon: PlayCircle },
  { value: "article", label: "Article", icon: Type },
  { value: "pdf", label: "PDF", icon: FileText },
] as const;

type Props = {
  courseId: string;
  lessonId: string | null;
  sections: { id: string; title: string }[];
  values: LessonFormValues;
};

export function LessonForm({ courseId, lessonId, sections, values }: Props) {
  const [state, action, pending] = useActionState(saveLesson.bind(null, courseId, lessonId), {});
  const [type, setType] = useState<LessonType>(values.type);
  const [videoUrl, setVideoUrl] = useState(values.videoUrl);
  const errors = state.fieldErrors;
  const video = getVideoSource(videoUrl);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Field label="Lesson title" htmlFor="title" errors={errors?.title}>
        <Input id="title" name="title" defaultValue={values.title} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Section" htmlFor="section" errors={errors?.section}>
          <Select id="section" name="section" defaultValue={values.section}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duration (minutes)" htmlFor="durationMinutes" errors={errors?.durationMinutes}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={0} max={1000} defaultValue={values.durationMinutes} />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Lesson type</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium",
                type === value && "border-primary bg-accent text-accent-foreground"
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="sr-only"
              />
              <Icon className="size-4" /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Keep all fields mounted so switching type doesn't lose input. */}
      <div className={type === "video" ? "space-y-3" : "hidden"}>
        <Field
          label="Video"
          htmlFor="videoUrl"
          errors={errors?.videoUrl}
          hint="Paste a YouTube link (unlisted works) or upload an MP4 (max 100 MB on the free plan)."
        >
          <FileUpload name="videoUrl" kind="video" defaultValue={values.videoUrl} onChange={setVideoUrl} invalid={!!errors?.videoUrl} />
        </Field>
        {video && (
          <div className="aspect-video overflow-hidden rounded-lg border bg-black">
            {video.kind === "youtube" ? (
              <iframe src={video.embedUrl} title="Video preview" className="size-full" allowFullScreen />
            ) : (
              <video src={video.src} controls className="size-full" />
            )}
          </div>
        )}
      </div>

      <div className={type === "pdf" ? "" : "hidden"}>
        <Field label="PDF document" htmlFor="pdfUrl" errors={errors?.pdfUrl}>
          <FileUpload name="pdfUrl" kind="pdf" defaultValue={values.pdfUrl} invalid={!!errors?.pdfUrl} />
        </Field>
      </div>

      <Field
        label={type === "article" ? "Article content (Markdown supported)" : "Lesson notes / transcript"}
        htmlFor="content"
        errors={errors?.content}
      >
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
          The AI tutor learns from this text. The more detailed it is, the better it can answer student questions.
        </p>
        <Textarea
          id="content"
          name="content"
          defaultValue={values.content}
          rows={14}
          className="font-mono text-[13px]"
          placeholder={type === "article" ? "# Introduction\n\nWrite your lesson here…" : "Key points, code samples, or the full transcript…"}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPreview" defaultChecked={values.isPreview} className="size-4 accent-primary" />
        Free preview — visitors can watch this lesson without enrolling
      </label>

      <div className="flex gap-2 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : lessonId ? "Save lesson" : "Create lesson"}
        </Button>
        <Link href={`/instructor/courses/${courseId}`} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
