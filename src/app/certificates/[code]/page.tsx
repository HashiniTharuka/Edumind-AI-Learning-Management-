import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, Download, GraduationCap } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getCertificate } from "@/lib/certificates";
import { formatDuration } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/certificates/[code]">): Promise<Metadata> {
  const cert = await getCertificate((await params).code);
  return { title: cert ? `Certificate · ${cert.courseTitle}` : "Certificate not found" };
}

/** Public, shareable verification page (e.g. for LinkedIn or a CV). */
export default async function CertificatePage({ params }: PageProps<"/certificates/[code]">) {
  const cert = await getCertificate((await params).code);
  if (!cert) notFound();

  const date = cert.completedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-success">
          <BadgeCheck className="size-5" /> Verified certificate · issued by EduMind
        </p>
        <a href={`/api/certificates/${cert.code}`} className={buttonClass("primary")}>
          <Download className="size-4" /> Download PDF
        </a>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-8 border-double border-primary/40 bg-card p-8 text-center shadow-lg sm:p-14">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-accent" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 text-primary">
            <GraduationCap className="size-7" />
            <span className="text-xl font-bold">EduMind</span>
          </div>
          <p className="mt-8 text-sm uppercase tracking-[0.3em] text-muted-foreground">Certificate of completion</p>
          <p className="mt-6 text-muted-foreground">This certifies that</p>
          <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{cert.studentName}</h1>
          <p className="mt-6 text-muted-foreground">has successfully completed the course</p>
          <h2 className="mt-2 text-2xl font-semibold text-primary">
            <Link href={`/courses/${cert.courseSlug}`} className="hover:underline">
              {cert.courseTitle}
            </Link>
          </h2>
          {cert.totalMinutes > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{formatDuration(cert.totalMinutes)} of content</p>
          )}
          <div className="mt-12 grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <div className="font-medium">{date}</div>
              <div className="border-t pt-1 text-muted-foreground">Date</div>
            </div>
            <div className="flex justify-center">
              <Award className="size-14 text-amber-500" />
            </div>
            <div>
              <div className="font-medium">{cert.instructorName}</div>
              <div className="border-t pt-1 text-muted-foreground">Instructor</div>
            </div>
          </div>
          <p className="mt-10 font-mono text-xs text-muted-foreground">Certificate ID: {cert.code}</p>
        </div>
      </div>
    </div>
  );
}
