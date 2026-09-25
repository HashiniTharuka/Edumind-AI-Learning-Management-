import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { role } = await searchParams;

  return (
    <Card className="p-8">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start learning or teaching in minutes.</p>
      <RegisterForm defaultRole={role === "instructor" ? "instructor" : "student"} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
