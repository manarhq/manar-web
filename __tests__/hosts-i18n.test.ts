import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/lib/nav-config";
import hostsAr from "@/messages/ar/hosts.json";
import hostsEn from "@/messages/en/hosts.json";
import navAr from "@/messages/ar/nav.json";
import navEn from "@/messages/en/nav.json";

function flat(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (value === null || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("hosts messages", () => {
  const en = new Map(flat(hostsEn));
  const ar = new Map(flat(hostsAr));

  it("has the same keys in English and Arabic", () => {
    expect([...ar.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("has no Arabic value left as the English text", () => {
    const same = [...en].filter(([k, v]) => typeof v === "string" && ar.get(k) === v);
    expect(same.map(([k]) => k)).toEqual([]);
  });

  it("has no empty value", () => {
    for (const [k, v] of [...en, ...ar]) expect(v, k).not.toBe("");
  });

  it("keeps the same placeholders in both locales", () => {
    const slots = (s: unknown) =>
      String(s)
        .match(/\{\w+\}/g)
        ?.sort()
        .join() ?? "";
    for (const [k, v] of en) expect(slots(ar.get(k)), k).toBe(slots(v));
  });

  it("labels every host status", () => {
    for (const s of ["PENDING", "APPROVED", "REJECTED", "REVOKED"]) {
      expect(hostsEn.status).toHaveProperty(s);
      expect(hostsAr.status).toHaveProperty(s);
    }
  });
});

describe("hosts nav entry", () => {
  it("is registered under Administration with a label in both locales", () => {
    const admin = NAV_GROUPS.find((g) => g.labelKey === "administration");
    expect(admin?.items.some((i) => i.href === "/hosts" && i.labelKey === "hosts")).toBe(true);
    expect(navEn.items.hosts).toBeTruthy();
    expect(navAr.items.hosts).toBeTruthy();
  });
});
