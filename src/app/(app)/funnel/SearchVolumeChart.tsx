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
// Minimal, monochrome — UC Red is the only accent. Code-split via the wrapper.
export default function SearchVolumeChart({ data }: { data: VolumePoint[] }) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" name="Searches/day" fill="#D6D3D1" radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="avg"
            name="7-day avg"
            stroke="#E00122"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
