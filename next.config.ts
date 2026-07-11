import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export — the studio is 100% client-side (WebGL + Zustand),
  // so it deploys to any static host / CDN (Cloudflare Pages, etc.).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
