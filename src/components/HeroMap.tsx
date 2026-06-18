"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

// UC main campus.
const CAMPUS: [number, number] = [39.1329, -84.515];

// A plain HTML pin instead of Leaflet's default marker image — avoids the
// well-known bundler/icon-path problem and gives us one clean UC-red dot.
const pinIcon = L.divIcon({
  className: "",
  html: '<span class="hero-pin" aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/**
 * A monochrome UC-campus map used purely as a static background texture.
 * Every interaction is disabled — it should feel like a printed map, not a
 * widget. Loaded client-side only (see LandingHero) because Leaflet needs the
 * DOM.
 */
export default function HeroMap() {
  return (
    <MapContainer
      center={CAMPUS}
      zoom={15}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={CAMPUS} icon={pinIcon} interactive={false} keyboard={false} />
    </MapContainer>
  );
}
