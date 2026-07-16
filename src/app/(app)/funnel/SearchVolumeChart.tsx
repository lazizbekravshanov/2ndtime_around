"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VolumePoint } from "@/lib/funnel";

// Raw daily searches (bars) + a 7-day moving average (line) to cut noise.
// Fully monochrome: UC Red is reserved for buttons / active state / status and
// never appears in data, so the trend line is ink over muted bars.
// Colors reference the design tokens via CSS vars so charts never drift.
export default function SearchVolumeChart({ data }: { data: VolumePoint[] }) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-faint)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
            interval={tickEvery - 1}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-faint)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--color-ink)", fillOpacity: 0.04 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              fontSize: 12,
              boxShadow: "none",
            }}
            labelStyle={{ color: "var(--color-ink)", fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="count"
            name="Searches/day"
            fill="var(--color-line-strong)"
            radius={[2, 2, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="7-day avg"
            stroke="var(--color-ink)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
