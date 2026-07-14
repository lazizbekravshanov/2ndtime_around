"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { XIcon } from "@/components/icons";

/**
 * Slim move-out countdown that surfaces the bulk move-out flow when the
 * semester-end crunch approaches. Dismissal is per semester (localStorage),
 * so it comes back next term. Starts hidden and reveals after mount, so a
 * previously-dismissed banner never flashes.
 */
export function MoveoutBanner({
  days,
  semesterKey,
  ctaHref = "/sell/moveout",
}: {
  days: number;
  semesterKey: string;
  /** Override the list-everything CTA (e.g. sign-in for anonymous visitors). */
  ctaHref?: string;
}) {
  const storageKey = `moveout-banner-${semesterKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(storageKey) === null);
    } catch {
      setVisible(true); // storage blocked — just show it
    }
  }, [storageKey]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // storage blocked — dismissal just won't persist
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">
          Move-out in {days === 0 ? "0 days — today" : `${days} day${days === 1 ? "" : "s"}`}.
        </span>{" "}
        <span className="text-faint">Don&apos;t bin it —</span>{" "}
        <Link
          href={ctaHref}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          list everything at once →
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss move-out reminder"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-paper hover:text-ink"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
