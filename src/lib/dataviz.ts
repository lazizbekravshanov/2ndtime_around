/**
 * Pure math for the two shared data-display primitives (Meter, StatTile).
 *
 * Lives in lib/ (not beside the components) because the components are .tsx and
 * this project's tsconfig uses `jsx: preserve` — vitest can only unit-test plain
 * .ts modules, which is why every tested helper lives here.
 */

/** Ratio as a 0..100 percentage. Clamped; returns 0 when max is empty. */
export function meterPercent(value: number, max: number): number {
  if (!(max > 0)) return 0;
  const pct = (value / max) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

export type DeltaDirection = "up" | "down" | "flat";

/**
 * A KPI delta, formatted for display. Deliberately returns no color: deltas
 * render faint with a direction icon. UC red is for buttons / active state /
 * status badges, never for data.
 */
export function formatDelta(n: number | null | undefined): {
  text: string;
  direction: DeltaDirection;
} {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) {
    return { text: "0%", direction: "flat" };
  }
  const direction: DeltaDirection = n > 0 ? "up" : "down";
  return { text: `${Math.abs(Math.round(n))}%`, direction };
}
