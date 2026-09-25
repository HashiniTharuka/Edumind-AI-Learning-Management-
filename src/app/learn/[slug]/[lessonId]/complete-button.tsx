"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { setLessonComplete } from "@/app/actions/enrollments";
import { Button } from "@/components/ui/button";

type Props = { courseId: string; lessonId: string; completed: boolean; nextHref?: string };

export function CompleteButton({ courseId, lessonId, completed, nextHref }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(completed);

  function toggle() {
    startTransition(async () => {
      const markDone = !optimisticDone;
      setOptimisticDone(markDone);
      const res = await setLessonComplete(courseId, lessonId, markDone);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.justCompleted && res.certificateCode) {
        toast.success("🎉 Course complete! Your certificate is ready.", {
          action: { label: "View", onClick: () => router.push(`/certificates/${res.certificateCode}`) },
          duration: 10_000,
        });
      } else if (markDone && nextHref) {
        router.push(nextHref);
      }
    });
  }

  return (
    <Button variant={optimisticDone ? "outline" : "primary"} onClick={toggle} disabled={pending}>
      {optimisticDone ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4" />}
      {optimisticDone ? "Completed" : nextHref ? "Complete & continue" : "Mark as complete"}
    </Button>
  );
}
