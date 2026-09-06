import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this directory. Next infers the root by walking
  // up for a lockfile, and git worktrees live under .worktrees/ inside the main
  // checkout - so it finds the parent's package-lock.json and names chunks
  // relative to it (`_worktrees_<branch>_app_...`) while the browser asks for
  // root-relative names. The mismatch 404s and surfaces as ChunkLoadError.
  turbopack: {
    root: path.resolve(__dirname),
  },
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
