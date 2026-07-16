import { meterPercent } from "@/lib/dataviz";

/**
 * The one bar/meter in the product. Before this, five hand-rolled variants
 * existed across funnel / impact / BadgeShelf with three thicknesses, two track
 * colors, and four fills for the same "value as a proportion" idea.
 *
 * One thickness, one track, one fill. The fill is ink, never accent — UC red
 * means buttons / active state / status, not data.
 */
export function Meter({
  value,
  max,
  tone = "neutral",
  className = "",
  label,
}: {
  value: number;
  max: number;
  /** "positive" (success green) is reserved for /impact's sustainability bars. */
  tone?: "neutral" | "positive";
  className?: string;
  /** Accessible name; omit when adjacent text already names the value. */
  label?: string;
}) {
  const pct = meterPercent(value, max);
  return (
    <div
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-1.5 overflow-hidden rounded-full bg-line ${className}`}
    >
      <div
        className={`h-full rounded-full ${
          tone === "positive" ? "bg-success" : "bg-ink"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
