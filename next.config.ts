import type { NextConfig } from "next";

// Set when deploying under a sub-path, e.g. GitHub Pages at /learn
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Static export: the whole app runs in the browser, no server or API key needed.
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
