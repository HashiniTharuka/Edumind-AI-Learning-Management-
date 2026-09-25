import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/dal";
import { NewCourseForm } from "./new-course-form";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireUser(["instructor", "admin"]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/instructor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to studio
      </Link>
      <Card className="mt-4 p-8">
        <h1 className="text-2xl font-bold">Create a new course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with the basics — you can change everything later before publishing.
        </p>
        <NewCourseForm />
      </Card>
    </div>
  );
}
