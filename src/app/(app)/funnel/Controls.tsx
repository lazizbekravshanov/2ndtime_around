"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/funnelRange";
import { refreshFunnel } from "./actions";

function hrefFor(range: RangeKey, catSort: string): string {
  const sp = new URLSearchParams();
  sp.set("range", range);
  if (catSort) sp.set("catsort", catSort);
  return `/funnel?${sp.toString()}`;
}

export function Controls({
  range,
  catSort,
  refreshedAt,
}: {
  range: RangeKey;
  catSort: string;
  refreshedAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Format the timestamp on the client only, to avoid SSR/tz hydration drift.
  const [refreshedLabel, setRefreshedLabel] = useState<string>("");
  useEffect(() => {
    setRefreshedLabel(
      new Date(refreshedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }, [refreshedAt]);

  function refresh() {
    startTransition(async () => {
      await refreshFunnel();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Date range"
        className="inline-flex rounded-lg border border-line bg-surface p-0.5"
      >
        {RANGE_OPTIONS.map((o) => {
          const active = o.key === range;
          return (
            <Link
              key={o.key}
              href={hrefFor(o.key, catSort)}
              aria-current={active ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-paper text-ink" : "text-faint hover:text-ink"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-sm text-faint">
        <span aria-live="polite">
          Last refreshed{refreshedLabel ? ` ${refreshedLabel}` : ""}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
        <a
          href={`/funnel/export?range=${range}`}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink transition-colors hover:bg-paper"
        >
          Export CSV
        </a>
      </div>
    </div>
  );
}
