import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploaded photos are served from /public/uploads in dev; allow large-ish
  // form bodies for the 4-photo upload step.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
