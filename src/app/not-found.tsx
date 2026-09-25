import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonClass("outline")}>
          Home
        </Link>
        <Link href="/courses" className={buttonClass("primary")}>
          Browse courses
        </Link>
      </div>
    </div>
  );
}
