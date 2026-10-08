import Link from "next/link";
import { GraduationCap, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/dal";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg">EduMind</span>
        </Link>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/courses" className="hover:text-foreground">
            Courses
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          )}
          {user && user.role !== "student" && (
            <Link href="/instructor" className="hidden hover:text-foreground sm:inline">
              Instructor Studio
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="hidden hover:text-foreground sm:inline">
              Admin
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <UserMenu user={{ id: user.id, name: user.name, email: user.email, role: user.role }} />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>
                Get started
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
