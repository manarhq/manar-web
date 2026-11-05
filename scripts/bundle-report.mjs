#!/usr/bin/env node
/**
 * Prints first-load JS per route (gzip bytes) from the last `next build`
 * (.next/diagnostics/route-bundle-stats.json). Turbopack builds print no sizes.
 * Usage: node scripts/bundle-report.mjs [--json]
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const stats = JSON.parse(readFileSync(".next/diagnostics/route-bundle-stats.json", "utf8"));
const cache = new Map();
const gz = (p) => {
  if (!cache.has(p)) cache.set(p, gzipSync(readFileSync(p)).length);
  return cache.get(p);
};
const rows = stats
  .map((s) => ({
    route: s.route,
    gzKB: +(s.firstLoadChunkPaths.reduce((n, p) => n + gz(p), 0) / 1024).toFixed(1),
  }))
  .sort((a, b) => a.route.localeCompare(b.route));

if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
else for (const r of rows) console.log(`${String(r.gzKB).padStart(8)} KB  ${r.route}`);
