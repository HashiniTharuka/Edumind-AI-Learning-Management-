"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Presentation,
  Shield,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { logout, login } from "@/app/actions/auth";

type UserProps = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "admin";
};

const ROLE_BADGES = {
  admin: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  instructor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  student: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

const DEMO_USERS = [
  { role: "student", label: "Student (Sam)", email: "student@edumind.dev", pass: "Learn12345", icon: GraduationCap },
  { role: "instructor", label: "Instructor (Dr. Maya)", email: "instructor@edumind.dev", pass: "Teach12345", icon: Presentation },
  { role: "admin", label: "Admin (Demo Admin)", email: "admin@edumind.dev", pass: "Admin12345", icon: Shield },
] as const;

export function UserMenu({ user }: { user: UserProps }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleQuickSwitch(email: string, pass: string) {
    setSwitching(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", pass);
    try {
      await login({}, fd);
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="grid size-9 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium leading-tight">{user.name}</div>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block rounded border px-1.5 py-0.2 text-[10px] font-semibold uppercase ${ROLE_BADGES[user.role]}`}>
              {user.role}
            </span>
          </div>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-card p-2 shadow-lg ring-1 ring-black/5 z-50">
          <div className="border-b px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-muted-foreground">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <LayoutDashboard className="size-4 text-muted-foreground" />
              <span>Dashboard</span>
            </Link>

            {user.role !== "student" && (
              <Link
                href="/instructor"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Presentation className="size-4 text-muted-foreground" />
                <span>Instructor Studio</span>
              </Link>
            )}

            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Shield className="size-4 text-muted-foreground" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="border-t my-1 pt-2">
            <div className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              <span>Switch Demo Role</span>
            </div>
            {DEMO_USERS.filter((d) => d.email !== user.email).map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.role}
                  disabled={switching}
                  onClick={() => handleQuickSwitch(d.email, d.pass)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Icon className="size-3.5" />
                  <span>Switch to {d.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t pt-1">
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
