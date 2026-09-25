"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addSection, renameSection } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";

function useToastResult(state: ActionState, onOk?: () => void) {
  const handleResult = useEffectEvent((result: ActionState) => {
    if (result.ok) onOk?.();
    else if (result.error) toast.error(result.fieldErrors?.title?.[0] ?? result.error);
  });
  useEffect(() => handleResult(state), [state]);
}

export function AddSectionForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(addSection.bind(null, courseId), {});
  useToastResult(state);

  return (
    <form action={action} className="flex gap-2">
      <Input name="title" placeholder="New section title, e.g. “Working with APIs”" aria-label="New section title" required />
      <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
        <Plus className="size-4" /> Add section
      </Button>
    </form>
  );
}

export function SectionTitle({ courseId, sectionId, title }: { courseId: string; sectionId: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(renameSection.bind(null, courseId, sectionId), {});
  useToastResult(state, () => setEditing(false));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex min-w-0 items-center gap-2 text-left font-semibold"
      >
        <span className="truncate">{title}</span>
        <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <form action={action} className="flex min-w-0 flex-1 items-center gap-1">
      <Input name="title" defaultValue={title} className="h-8" autoFocus aria-label="Section title" required />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} aria-label="Save">
        <Check className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
        <X className="size-4" />
      </Button>
    </form>
  );
}
