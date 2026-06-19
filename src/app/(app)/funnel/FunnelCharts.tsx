"use client";

import dynamic from "next/dynamic";
import type { VolumePoint } from "@/lib/funnel";

// Code-split: Recharts is only fetched when this client island mounts, so it
// never bloats the main bundle. A plain skeleton holds the space meanwhile.
const SearchVolumeChart = dynamic(() => import("./SearchVolumeChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-lg bg-paper" aria-hidden />
  ),
});

export function FunnelCharts({ volume }: { volume: VolumePoint[] }) {
  return <SearchVolumeChart data={volume} />;
}
