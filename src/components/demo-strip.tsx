"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Presentation, Shield, Sparkles, ArrowRight } from "lucide-react";
import { login } from "@/app/actions/auth";

const DEMO_CARDS = [
  {
    role: "student",
    title: "Student View",
    email: "student@edumind.dev",
    pass: "Learn12345",
    icon: GraduationCap,
    desc: "Take lessons, ask the AI Tutor with RAG citations, pass quizzes, and earn certificates.",
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    role: "instructor",
    title: "Instructor Studio",
    email: "instructor@edumind.dev",
    pass: "Teach12345",
    icon: Presentation,
    desc: "Build courses, manage curriculum, auto-generate AI quizzes, and review statistics.",
    color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    role: "admin",
    title: "Admin Console",
    email: "admin@edumind.dev",
    pass: "Admin12345",
    icon: Shield,
    desc: "Platform analytics, 30-day enrollment charts, role management, and course moderation.",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
] as const;

export function DemoStrip() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const router = useRouter();

  async function handleQuickLogin(email: string, pass: string, role: string) {
    setLoadingRole(role);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", pass);
    try {
      await login({}, fd);
      router.push(role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/dashboard");
    } catch {
      setLoadingRole(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="rounded-3xl border bg-gradient-to-b from-card to-card/50 p-6 sm:p-10 shadow-sm">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Interactive Demo Sandbox
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Explore EduMind with 1-Click Demo Profiles</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Switch between roles instantly to experience the full student, instructor, and administrative platform.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {DEMO_CARDS.map((c) => {
            const Icon = c.icon;
            const isLoading = loadingRole === c.role;
            return (
              <div
                key={c.role}
                className={`relative flex flex-col justify-between rounded-2xl border bg-gradient-to-br ${c.color} p-5 transition-all hover:shadow-md`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-card shadow-xs">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground border">
                      {c.email}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground text-lg">{c.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-border/40 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={Boolean(loadingRole)}
                    onClick={() => handleQuickLogin(c.email, c.pass, c.role)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {isLoading ? "Signing in…" : "Launch profile"} <ArrowRight className="size-3.5" />
                  </button>
                  <span className="text-[11px] text-muted-foreground font-mono">pw: {c.pass}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
