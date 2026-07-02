"use client";

import dynamic from "next/dynamic";

// MapLibre needs the DOM, so the map is client-only and code-split into its own
// chunk. `loading` returns null — until it initialises the backdrop is just the
// paper background, so there's no hydration mismatch and no layout shift.
const HeroMap = dynamic(() => import("@/components/HeroMap"), {
  ssr: false,
  loading: () => null,
});

/**
 * Thin client island that mounts the lazy 3D campus map absolutely behind the
 * (server-rendered) hero content. `z-0` gives it its own stacking context so
 * MapLibre's canvas can never paint over the headline/CTA.
 */
export function HeroMapBackdrop() {
  return (
    // `inert` (not just aria-hidden) so nothing inside — MapLibre's canvas
    // gets a tabindex, its attribution has links — can ever take focus.
    <div className="absolute inset-0 z-0" aria-hidden="true" inert>
      <HeroMap />
    </div>
  );
}
