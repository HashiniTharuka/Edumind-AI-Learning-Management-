"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

type Props = Omit<ButtonProps, "onClick" | "action"> & {
  action: () => Promise<ActionState | void>;
  confirm?: string;
  pendingLabel?: React.ReactNode;
};

/** Runs a (bound) server action on click and reports the result as a toast. */
export function ActionButton({ action, confirm, pendingLabel, children, disabled, ...props }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
          else if (result?.message) toast.success(result.message);
        });
      }}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
