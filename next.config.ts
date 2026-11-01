import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { STATIC_SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained `.next/standalone` server so the Docker
  // runtime stage only needs the traced output, not the full node_modules
  // tree. See docs/dependency-decisions.md and the Dockerfile.
  output: "standalone",
  poweredByHeader: false,
  // The console is an authenticated operator tool for customers' SOC teams;
  // no page, BFF route or API response should ever appear in a search index.
  // A header (not robots.txt `Disallow`) because crawlers must be allowed to
  // fetch a URL to see its noindex; a disallowed URL can still be indexed from
  // external links. The public site is manar-landing. The other static security headers ride
  // along on every route, static assets included; the nonce CSP is set per request in proxy.ts.
  async headers() {
    return [
      {
        // The service worker must not be cached for long, or a fix would not reach browsers.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: Object.entries(STATIC_SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
