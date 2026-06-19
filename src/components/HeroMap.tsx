"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MlMap } from "maplibre-gl";

// UC main campus — MapLibre wants [lng, lat].
const CAMPUS: [number, number] = [-84.515, 39.1329];
const START_BEARING = -17;

/**
 * A near-monochrome 3D MapLibre map of UC's campus, used purely as a calm
 * background texture behind the hero. Every interaction is disabled, so it
 * reads like printed paper, not a widget. Buildings are extruded from the
 * OpenStreetMap "building" layer in OpenFreeMap's free vector tiles (no API
 * key, attribution auto-added). The only color is one UC-red pin at center.
 *
 * Loaded client-side only (see HeroMapBackdrop) and initialised at idle so it
 * never blocks the hero's first paint or regresses LCP.
 */
export default function HeroMap() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let map: MlMap | undefined;
    let raf = 0;
    let cancelled = false;
    const reduceMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    async function init() {
      if (cancelled || !container) return;
      // Dynamic import keeps the MapLibre GL engine in its own chunk — out of
      // the main bundle, fetched only once we're idle.
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container) return;

      map = new maplibregl.Map({
        container,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: CAMPUS,
        zoom: 15.5,
        pitch: 50,
        bearing: START_BEARING,
        interactive: false, // kills scroll/drag/dblclick/touch/keyboard at once
        attributionControl: { compact: true },
      });

      map.on("load", () => {
        if (!map || cancelled) return;
        // OpenFreeMap uses the OpenMapTiles schema; find its vector source by
        // type rather than hardcoding the id, then extrude the building layer.
        const sources = map.getStyle().sources ?? {};
        const vectorSource = Object.keys(sources).find(
          (id) => (sources[id] as { type?: string }).type === "vector",
        );
        if (!vectorSource) return;
        map.addLayer({
          id: "hero-buildings",
          type: "fill-extrusion",
          source: vectorSource,
          "source-layer": "building",
          minzoom: 14,
          paint: {
            // Paper-like monochrome massing — taller buildings read slightly
            // darker so it has depth without becoming a vivid city.
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "render_height"], 0],
              0,
              "#E7E5E4",
              40,
              "#D6D3D1",
            ],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 3],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.9,
          },
        });
      });

      // One UC-red pin (the pulsing dot) — the single spot of color.
      const pin = document.createElement("span");
      pin.className = "hero-pin";
      pin.setAttribute("aria-hidden", "true");
      new maplibregl.Marker({ element: pin }).setLngLat(CAMPUS).addTo(map);

      // Very slow auto-rotate, unless the user prefers reduced motion.
      if (!reduceMotion) {
        let bearing = START_BEARING;
        const spin = () => {
          if (cancelled || !map) return;
          bearing = (bearing + 0.02) % 360; // ~1.2°/s — barely perceptible
          map.setBearing(bearing);
          raf = requestAnimationFrame(spin);
        };
        raf = requestAnimationFrame(spin);
      }
    }

    // Defer init until the browser is idle so the hero text/CTA paint first.
    // (Safari lacks requestIdleCallback at runtime, so guard with typeof.)
    const hasRic = typeof window.requestIdleCallback === "function";
    const idleHandle = hasRic
      ? window.requestIdleCallback(init)
      : window.setTimeout(init, 200);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (hasRic && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle);
      }
      map?.remove();
    };
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
