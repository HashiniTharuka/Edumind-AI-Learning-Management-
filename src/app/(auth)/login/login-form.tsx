"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Field label="Email" htmlFor="email" errors={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required />
      </Field>
      <Field label="Password" htmlFor="password" errors={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
