import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dev screenshots/demos clean of the dev-tools badge.
  devIndicators: false,
  // Uploaded photos are served from /public/uploads in dev; allow large-ish
  // form bodies for the 4-photo upload step.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
