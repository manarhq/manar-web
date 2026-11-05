import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createQueryClient } from "@/app/providers";
import { LIVE_ROOTS, RELAXED_ROOTS } from "@/lib/api/query-freshness";

const ROOT = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("query freshness", () => {
  it("every query root key in the console is classified as live or relaxed", () => {
    const roots = new Set<string>();
    for (const f of [...files("hooks"), ...files("components"), ...files("app"), ...files("lib")]) {
      const src = readFileSync(join(ROOT, f), "utf8");
      for (const m of src.matchAll(/(?:queryKey:|KEY =|QUERY_KEY =)\s*\[\s*"([\w-]+)"/g))
        roots.add(m[1]);
    }
    const known = new Set<string>([...LIVE_ROOTS, ...RELAXED_ROOTS]);
    expect([...roots].filter((r) => !known.has(r))).toEqual([]);
    expect(LIVE_ROOTS.filter((r) => (RELAXED_ROOTS as readonly string[]).includes(r))).toEqual([]);
  });

  it("security-relevant queries are always stale and refetch on focus; the rest get 30 s and none", () => {
    const client = createQueryClient();
    const table: Record<string, unknown> = {};
    for (const root of LIVE_ROOTS) {
      const d = client.getQueryDefaults([root]);
      table[root] = `${d.staleTime}/${d.refetchOnWindowFocus}`;
      expect(d.staleTime, root).toBe(0);
      expect(d.refetchOnWindowFocus, root).toBe(true);
    }
    for (const root of RELAXED_ROOTS) {
      const d = client.getQueryDefaults([root]);
      expect(d.staleTime, root).toBeUndefined(); // falls through to the client default
      expect(d.refetchOnWindowFocus, root).toBeUndefined();
    }
    const defaults = client.getDefaultOptions().queries;
    expect([defaults?.staleTime, defaults?.refetchOnWindowFocus]).toEqual([30_000, false]);
    // The security-relevant list, for reviewers: these must never drift to a timer.
    for (const must of [
      "approvals",
      "incidents",
      "agents",
      "tasks",
      "policies",
      "tools",
      "users",
      "quarantines",
      "hosts",
      "ai-systems",
      "workspace",
    ])
      expect(LIVE_ROOTS).toContain(must);
  });
});
