"use client";

import { useActionState } from "react";
import { createCourse } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { CATEGORIES, LEVELS } from "@/lib/constants";

export function NewCourseForm() {
  const [state, action, pending] = useActionState(createCourse, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && !state.fieldErrors && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Field label="Course title" htmlFor="title" errors={state.fieldErrors?.title}>
        <Input id="title" name="title" placeholder="e.g. Full-Stack Web Development with Next.js" required />
      </Field>
      <Field label="Subtitle" htmlFor="subtitle" errors={state.fieldErrors?.subtitle} hint="One line that sells the course.">
        <Input id="subtitle" name="subtitle" placeholder="Build and deploy real apps from scratch" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" errors={state.fieldErrors?.category}>
          <Select id="category" name="category" defaultValue="Web Development">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Level" htmlFor="level" errors={state.fieldErrors?.level}>
          <Select id="level" name="level" defaultValue="beginner" className="capitalize">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create course"}
      </Button>
    </form>
  );
}
