"use client";

import { useActionState, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { submitWithoutReset } from "@/lib/forms";
import { cn } from "@/lib/utils";

export function ReviewForm({ courseId, initial }: { courseId: string; initial?: { rating: number; comment: string } }) {
  const [state, action, pending] = useActionState(submitReview.bind(null, courseId), {});
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.fieldErrors?.rating?.[0] ?? state.error);
  }, [state]);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea name="comment" defaultValue={initial?.comment} placeholder="What did you think of this course?" maxLength={1000} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : initial ? "Update review" : "Submit review"}
      </Button>
    </form>
  );
}
