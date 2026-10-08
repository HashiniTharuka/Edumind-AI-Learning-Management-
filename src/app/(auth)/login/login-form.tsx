"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, GraduationCap, Shield, UserCheck, Sparkles } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

const DEMO_PRESETS = [
  {
    role: "student",
    title: "Student",
    email: "student@edumind.dev",
    password: "Learn12345",
    icon: GraduationCap,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    role: "instructor",
    title: "Instructor",
    email: "instructor@edumind.dev",
    password: "Teach12345",
    icon: UserCheck,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    role: "admin",
    title: "Admin",
    email: "admin@edumind.dev",
    password: "Admin12345",
    icon: Shield,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
] as const;

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function fillDemo(preset: (typeof DEMO_PRESETS)[number]) {
    setEmail(preset.email);
    setPassword(preset.password);
  }

  return (
    <div className="space-y-6">
      {/* 1-Click Interactive Demo Accounts */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Quick Demo 1-Click Fill</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Click an account below to auto-fill credentials:
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_PRESETS.map((p) => {
            const Icon = p.icon;
            const isSelected = email === p.email;
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => fillDemo(p)}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-full border ${p.badgeColor}`}>
                  <Icon className="size-3.5" />
                </span>
                <span className="mt-1.5 truncate text-foreground">{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Field label="Email" htmlFor="email" errors={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" errors={state.fieldErrors?.password}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
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
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
