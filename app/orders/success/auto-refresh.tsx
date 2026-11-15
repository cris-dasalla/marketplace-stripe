"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-runs the server component every `everyMs` until it stops rendering this (or tries run out). */
export function AutoRefresh({ everyMs = 2000, maxTries = 30 }: { everyMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > maxTries) window.clearInterval(timer);
      else router.refresh();
    }, everyMs);
    return () => window.clearInterval(timer);
  }, [router, everyMs, maxTries]);
  return null;
}
