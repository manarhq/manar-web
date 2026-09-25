import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained `.next/standalone` server so the Docker
  // runtime stage only needs the traced output, not the full node_modules
  // tree. See docs/dependency-decisions.md and the Dockerfile.
  output: "standalone",
  // The console is an authenticated operator tool for customers' SOC teams;
  // no page, BFF route or API response should ever appear in a search index.
  // A header (not robots.txt `Disallow`) because crawlers must be allowed to
  // fetch a URL to see its noindex; a disallowed URL can still be indexed from
  // external links. The public site is manar-landing.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
