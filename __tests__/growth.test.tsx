import { describe, expect, it } from "vitest";

import growthAr from "@/messages/ar/growth.json";
import growthEn from "@/messages/en/growth.json";

function flat(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (value === null || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("growth messages", () => {
  const en = new Map(flat(growthEn));
  const ar = new Map(flat(growthAr));
  it("has the same keys and placeholders in English and Arabic, none empty", () => {
    expect([...ar.keys()].sort()).toEqual([...en.keys()].sort());
    const slots = (s: unknown) =>
      String(s)
        .match(/\{\w+\}/g)
        ?.sort()
        .join() ?? "";
    for (const [k, v] of en) {
      expect(slots(ar.get(k)), k).toBe(slots(v));
      expect(v, k).not.toBe("");
    }
  });
});
