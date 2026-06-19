"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VolumePoint } from "@/lib/funnel";

// Minimal, monochrome — UC Red is the only accent. Loaded only via the
// code-split wrapper so Recharts stays out of the main bundle.
export default function SearchVolumeChart({ data }: { data: VolumePoint[] }) {
  // Show ~6 x-axis labels so 30 days stays legible.
  const tickEvery = Math.ceil(data.length / 6);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#E7E5E4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#78716C", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E7E5E4" }}
            interval={tickEvery - 1}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#78716C", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(28,24,23,0.04)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E7E5E4",
              fontSize: 12,
              boxShadow: "none",
            }}
            labelStyle={{ color: "#1C1817", fontWeight: 600 }}
          />
          <Bar dataKey="count" fill="#E00122" radius={[2, 2, 0, 0]} name="Searches" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
