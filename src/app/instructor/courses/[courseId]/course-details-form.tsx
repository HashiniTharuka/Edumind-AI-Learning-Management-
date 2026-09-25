"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateCourse } from "@/app/actions/courses";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { submitWithoutReset } from "@/lib/forms";

type CourseFields = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  thumbnailUrl: string;
  tags: string;
  whatYouWillLearn: string;
};

export function CourseDetailsForm({ courseId, course }: { courseId: string; course: CourseFields }) {
  const [state, action, pending] = useActionState(updateCourse.bind(null, courseId), {});
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-5">
      <Field label="Title" htmlFor="title" errors={errors?.title}>
        <Input id="title" name="title" defaultValue={course.title} required />
      </Field>
      <Field label="Subtitle" htmlFor="subtitle" errors={errors?.subtitle}>
        <Input id="subtitle" name="subtitle" defaultValue={course.subtitle} />
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        errors={errors?.description}
        hint="What is this course about and who is it for? (50+ characters to publish)"
      >
        <Textarea id="description" name="description" defaultValue={course.description} rows={7} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" errors={errors?.category}>
          <Select id="category" name="category" defaultValue={course.category}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Level" htmlFor="level" errors={errors?.level}>
          <Select id="level" name="level" defaultValue={course.level} className="capitalize">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Thumbnail" htmlFor="thumbnailUrl" errors={errors?.thumbnailUrl} hint="16:9 image, e.g. 1280×720.">
        <FileUpload name="thumbnailUrl" kind="image" defaultValue={course.thumbnailUrl} invalid={!!errors?.thumbnailUrl} />
      </Field>
      <Field
        label="What students will learn"
        htmlFor="whatYouWillLearn"
        errors={errors?.whatYouWillLearn}
        hint="One outcome per line (up to 12)."
      >
        <Textarea
          id="whatYouWillLearn"
          name="whatYouWillLearn"
          defaultValue={course.whatYouWillLearn}
          rows={5}
          placeholder={"Build a REST API with Node.js\nModel data in MongoDB"}
        />
      </Field>
      <Field label="Tags" htmlFor="tags" errors={errors?.tags} hint="Comma separated, e.g. react, nextjs, mongodb">
        <Input id="tags" name="tags" defaultValue={course.tags} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
