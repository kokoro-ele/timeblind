import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: data is injected from data/*.json at build time (SSG).
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
