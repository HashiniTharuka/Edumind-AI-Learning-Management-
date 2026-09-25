"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        An unexpected error occurred. Please try again — if it keeps happening, check that the database is reachable.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
