import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained `.next/standalone` server so the Docker
  // runtime stage only needs the traced output, not the full node_modules
  // tree. See docs/dependency-decisions.md and the Dockerfile.
  output: "standalone",
};

export default nextConfig;
