import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COVERAGE_VALUES } from "@/components/manar/ai-systems/coverage";
import { NAV_GROUPS } from "@/lib/nav-config";
import aiSystemsEn from "@/messages/en/aiSystems.json";
import aiSystemsAr from "@/messages/ar/aiSystems.json";
import navEn from "@/messages/en/nav.json";
import navAr from "@/messages/ar/nav.json";

/**
 * The project's standing i18n rules, enforced for the surface this
 * release adds: EN and AR stay at exact key parity, every enum this
 * console renders has a label in both files, and nothing under
 * `components/manar/ai-systems/` reaches for a physical-direction
 * Tailwind utility that would break RTL.
 */

function flatKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("aiSystems message files stay at exact EN/AR parity", () => {
  const en = flatKeys(aiSystemsEn).sort();
  const ar = flatKeys(aiSystemsAr).sort();

  it("has the same key count in both locales", () => {
    expect(ar.length).toBe(en.length);
  });

  it("has no key present in only one locale", () => {
    expect(en.filter((key) => !ar.includes(key))).toEqual([]);
    expect(ar.filter((key) => !en.includes(key))).toEqual([]);
  });

  it("has no untranslated Arabic string left identical to its English source", () => {
    // Slug/placeholder examples are deliberately identical (they are
    // literal kebab-case identifiers, not prose), so only prose keys are
    // checked here.
    const identical = en.filter((key) => {
      const read = (source: unknown) =>
        key
          .split(".")
          .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], source);
      const a = read(aiSystemsEn);
      const b = read(aiSystemsAr);
      return typeof a === "string" && a === b && !/^[a-z0-9-]+$/.test(a);
    });
    expect(identical).toEqual([]);
  });
});

describe("nav registers the AI systems route in both locales", () => {
  it("adds one Governance entry without restructuring the taxonomy", () => {
    expect(NAV_GROUPS.map((group) => group.labelKey)).toEqual([
      "monitoring",
      "governance",
      "socPack",
      "administration",
    ]);
    const governance = NAV_GROUPS.find((group) => group.labelKey === "governance");
    expect(governance?.items.some((item) => item.href === "/ai-systems")).toBe(true);
  });

  it("labels the entry in EN and AR", () => {
    expect(navEn.items.aiSystems).toBeTruthy();
    expect(navAr.items.aiSystems).toBeTruthy();
    expect(navAr.items.aiSystems).not.toBe(navEn.items.aiSystems);
  });

  it("keeps nav.json at exact EN/AR parity", () => {
    expect(flatKeys(navAr).sort()).toEqual(flatKeys(navEn).sort());
  });

  it("has a label for every nav item this file registers", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(Object.keys(navEn.items)).toContain(item.labelKey);
        expect(Object.keys(navAr.items)).toContain(item.labelKey);
      }
    }
  });
});

describe("every enum this surface renders has a label in both locales", () => {
  const enums: Record<string, readonly string[]> = {
    coverage: COVERAGE_VALUES,
    lifecycleState: ["DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "RETIRED"],
    environment: ["DEVELOPMENT", "STAGING", "PRODUCTION"],
    dataClassification: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
  };

  const locales: Record<string, unknown>[] = [
    aiSystemsEn as unknown as Record<string, unknown>,
    aiSystemsAr as unknown as Record<string, unknown>,
  ];

  for (const [namespace, values] of Object.entries(enums)) {
    it(`covers every ${namespace} value`, () => {
      for (const value of values) {
        for (const messages of locales) {
          const entry = (messages[namespace] as Record<string, unknown>)[value];
          expect(entry, `${namespace}.${value}`).toBeDefined();
          if (namespace === "coverage") {
            // Coverage carries a label AND the sentence explaining what
            // the verdict actually asserts.
            expect((entry as Record<string, string>).label).toBeTruthy();
            expect((entry as Record<string, string>).meaning).toBeTruthy();
          }
        }
      }
    });
  }

  it("gives the four coverage values four different labels in each locale", () => {
    for (const messages of locales) {
      const coverage = messages.coverage as Record<string, { label: string }>;
      const labels = COVERAGE_VALUES.map((value) => coverage[value].label);
      expect(new Set(labels).size).toBe(COVERAGE_VALUES.length);
    }
  });
});

describe("the AI systems components use logical CSS properties only", () => {
  const dir = path.join(process.cwd(), "components", "manar", "ai-systems");
  const files = readdirSync(dir).filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));

  /** Physical-direction utilities that do not flip under `dir="rtl"`.
   * The console's rule is `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-` instead. */
  // `rounded-l`/`rounded-r` need the lookahead so the size utilities
  // `rounded-lg`/`rounded-r`... (`rounded-lg` in particular) are not
  // mistaken for the physical corner utilities `rounded-l`/`rounded-l-*`.
  const FORBIDDEN =
    /(?:^|[\s"'`{])-?(?:ml-|mr-|pl-|pr-|left-|right-|border-l-|border-r-|rounded-l(?![a-z])|rounded-r(?![a-z])|text-left|text-right)/;

  it("finds the component directory", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} uses no physical-direction utility`, () => {
      const source = readFileSync(path.join(dir, file), "utf8");
      const offending = source
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => FORBIDDEN.test(line));
      expect(offending.map(({ index, line }) => `${index + 1}: ${line.trim()}`)).toEqual([]);
    });
  }
});
