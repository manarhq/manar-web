import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained `.next/standalone` server so the Docker
  // runtime stage only needs the traced output, not the full node_modules
  // tree. See docs/dependency-decisions.md and the Dockerfile.
  output: "standalone",
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
