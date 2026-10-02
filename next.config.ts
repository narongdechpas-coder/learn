import type { NextConfig } from "next";

// Static export: the whole app runs in the browser, no server or API key needed.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
