import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { routeShape, STATIC_ROUTE_SEGMENTS } from "@/lib/telemetry/track";

function folders(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (!statSync(p).isDirectory()) return [];
    return [n, ...folders(p)];
  });
}

describe("routeShape", () => {
  it("keeps known pages", () => {
    expect(routeShape("/en/settings/privacy")).toBe("/en/settings/privacy");
    expect(routeShape("/ar/ai-tools/spend")).toBe("/ar/ai-tools/spend");
  });
  it("turns tokens, emails and slugs into :id", () => {
    expect(routeShape("/en/join/Zm9vLmJhci1iYXpfcXV4LTEyMw")).toBe("/en/join/:id");
    expect(routeShape("/en/p/jane.doe@example.com")).toBe("/en/p/:id");
    expect(routeShape("/en/p/my-cool-slug")).toBe("/en/p/:id");
    expect(routeShape("/en/sessions/3f2a9c1e-1111-2222-3333-444455556666")).toBe(
      "/en/sessions/:id",
    );
  });
  it("lists exactly the static route folders", () => {
    const names = folders(join(__dirname, "..", "app", "[locale]")).filter(
      (n) => !n.startsWith("[") && !n.startsWith("("),
    );
    const listed = [...STATIC_ROUTE_SEGMENTS].filter((s) => s !== "en" && s !== "ar");
    expect(listed.sort()).toEqual([...new Set(names)].sort());
  });
});
