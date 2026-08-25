import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server is initialized on localhost; loading the app over the LAN IP is a
  // cross-origin request, which Next blocks for dev-only endpoints (incl. HMR).
  allowedDevOrigins: ["192.168.1.7", "192.168.1.*"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
