import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  const m = manifest();
  it("is installable: standalone, start url, 192 and 512 icons that exist, one maskable", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of icons) expect(existsSync(`public${i.src}`)).toBe(true);
  });
  it("icons are real PNGs", () => {
    for (const i of m.icons ?? [])
      expect(readFileSync(`public${i.src}`).subarray(1, 4).toString()).toBe("PNG");
  });
});
