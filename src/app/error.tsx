"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { Button, buttonClasses } from "@/components/ui/Button";

/**
 * Route-level error boundary: a calm, designed dead end instead of a white
 * screen. `reset()` re-renders the segment, so transient failures (flaky
 * network, a hiccuping query) recover in place.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for debugging — the user never sees a raw stack.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <LogoMark className="h-8 w-8" />
      <h1 className="mt-6 text-2xl font-semibold">Something went sideways</h1>
      <p className="mt-2 max-w-sm text-sm text-faint">
        That wasn&apos;t supposed to happen. It&apos;s us, not you — try again,
        or head back to browsing.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/browse" className={buttonClasses("secondary")}>
          Back to browsing
        </Link>
      </div>
    </main>
  );
}
