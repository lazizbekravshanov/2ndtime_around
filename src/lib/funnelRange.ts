// Client-safe date-range helpers — NO database/server imports, so client
// components (Controls) can import RANGE_OPTIONS without pulling Prisma into
// the browser bundle. The server aggregate module re-uses these.

const DAY_MS = 24 * 60 * 60 * 1000;

export type RangeKey = "7" | "30" | "90" | "all";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

export type Range = {
  key: RangeKey;
  label: string;
  since: Date | null;
  prevSince: Date | null;
  prevUntil: Date | null;
  volumeDays: number;
};

export function parseRange(value?: string): Range {
  const key: RangeKey =
    value === "7" || value === "90" || value === "all" ? value : "30";
  const opt = RANGE_OPTIONS.find((o) => o.key === key)!;
  if (key === "all") {
    return { key, label: opt.label, since: null, prevSince: null, prevUntil: null, volumeDays: 90 };
  }
  const days = Number(key);
  const now = Date.now();
  const since = new Date(now - days * DAY_MS);
  return {
    key,
    label: opt.label,
    since,
    prevSince: new Date(now - 2 * days * DAY_MS),
    prevUntil: since,
    volumeDays: days,
  };
}
