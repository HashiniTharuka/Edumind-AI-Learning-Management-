"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Shows a one-time toast after a redirect (e.g. ?saved=lesson), then cleans the URL. */
export function FlashToast({ message }: { message?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!message) return;
    toast.success(message);
    router.replace(pathname, { scroll: false });
  }, [message, pathname, router]);

  return null;
}
