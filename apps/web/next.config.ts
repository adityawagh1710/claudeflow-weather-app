import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Emit a minimal self-contained server bundle for slim Docker images.
  output: "standalone",
};

export default nextConfig;
