"use client";

import { useActionState, useState } from "react";
import { BookOpen, Eye, EyeOff, Presentation } from "lucide-react";
import { register } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const roles = [
  { value: "student", label: "I want to learn", icon: BookOpen },
  { value: "instructor", label: "I want to teach", icon: Presentation },
] as const;

export function RegisterForm({ defaultRole }: { defaultRole: "student" | "instructor" }) {
  const [state, action, pending] = useActionState(register, {});
  const [showPassword, setShowPassword] = useState(false);
  const selectedRole = state.values?.role ?? defaultRole;

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Account type</legend>
        {roles.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
              "has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground"
            )}
          >
            <input type="radio" name="role" value={value} defaultChecked={selectedRole === value} className="sr-only" />
            <Icon className="size-5" />
            {label}
          </label>
        ))}
      </fieldset>
      <FieldError errors={state.fieldErrors?.role} />

      <Field label="Full name" htmlFor="name" errors={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={state.values?.name} required />
      </Field>
      <Field label="Email" htmlFor="email" errors={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        errors={state.fieldErrors?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required className="pr-10" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
