import type { ReactNode } from "react";
import { formatDelta } from "@/lib/dataviz";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";

/**
 * The one stat tile in the product — funnel KPIs, impact headlines, leaderboard
 * summaries. Previously each surface inlined its own, drifting to different
 * value scales (text-3xl vs text-4xl).
 *
 * The delta is deliberately colorless: direction is carried by a chevron, not by
 * red. UC red means buttons / active state / status badges, not data.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  /** Percentage change vs. the previous period. */
  delta?: number | null;
  hint?: string;
  icon?: ReactNode;
}) {
  const d = delta === undefined ? null : formatDelta(delta);
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="flex items-center gap-1.5 text-sm text-faint">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {d && (
        <p className="mt-1 flex items-center gap-1 text-xs text-faint">
          {d.direction === "up" && <ChevronUpIcon className="h-3.5 w-3.5" />}
          {d.direction === "down" && <ChevronDownIcon className="h-3.5 w-3.5" />}
          <span className="tabular-nums">{d.text}</span>
          {hint && <span className="text-faint">{hint}</span>}
        </p>
      )}
      {!d && hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
