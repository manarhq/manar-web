import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REPORT_COLORS, toWeeklyReport } from "@/lib/personal/report";

describe("report card mapping", () => {
  it("maps the API names to the Home card's", () => {
    expect(
      toWeeklyReport({
        from: "a",
        to: "b",
        actions: 1,
        askedYou: 2,
        blocked: 3,
        secretsKeptSafe: 4,
        series: [1],
      }),
    ).toEqual({
      from: "a",
      to: "b",
      actions: 1,
      asked: 2,
      blocked: 3,
      secretsKeptSafe: 4,
      daily: [1],
    });
  });
  it("OG image colours match the --report-* tokens", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const [name, value] of Object.entries(REPORT_COLORS)) {
      expect(css).toContain(`${name}: ${value};`);
    }
  });
});

describe("features strings", () => {
  it("EN and AR have the same keys", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === "object" && v ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      );
    const en = JSON.parse(readFileSync("messages/en/features.json", "utf8"));
    const ar = JSON.parse(readFileSync("messages/ar/features.json", "utf8"));
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
});
