import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <Card className="p-8">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue learning.</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to EduMind?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
