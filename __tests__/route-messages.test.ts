import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { computeNeeds, computeRouteMessages } from "../scripts/route-messages.mjs";
import { mergeMessages, pickMessages } from "@/i18n/pick-messages";
import { routing } from "@/i18n/routing";
import { NAMESPACES } from "@/i18n/namespaces";

const ROOT = join(__dirname, "..");
const generated = JSON.parse(
  readFileSync(join(ROOT, "i18n/route-messages.generated.json"), "utf8"),
);
interface Layers {
  base: string[];
  groups: Record<string, string[]>;
  areas: Record<string, string[]>;
}
const computed = computeRouteMessages() as Layers;
const needs = computeNeeds() as Layers;

function catalogue(locale: string): Record<string, unknown> {
  return Object.fromEntries(
    NAMESPACES.map((n) => [
      n,
      JSON.parse(readFileSync(join(ROOT, `messages/${locale}/${n}.json`), "utf8")),
    ]),
  );
}

function lookup(tree: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((t, k) => (t as Record<string, unknown> | undefined)?.[k], tree);
}

describe("per-route client messages", () => {
  it("the committed list is current (run: node scripts/route-messages.mjs)", () => {
    expect(generated).toEqual(computed);
  });

  it("every area that needs extra messages has a layout that sends them", () => {
    for (const [area, paths] of Object.entries(computed.areas)) {
      const file = join(ROOT, "app/[locale]", area, "layout.tsx");
      if (paths.length === 0) continue;
      expect(existsSync(file), `${area} needs a layout.tsx`).toBe(true);
      expect(readFileSync(file, "utf8")).toContain(`<RouteMessages area="${area}">`);
    }
    for (const group of Object.keys(computed.groups)) {
      const src = readFileSync(join(ROOT, "app/[locale]", group, "layout.tsx"), "utf8");
      expect(src).toContain(`<RouteMessages area="${group}">`);
    }
  });

  for (const locale of routing.locales) {
    it(`${locale}: every page finds every message it reads, and the root sends far less than the catalogue`, () => {
      const all = catalogue(locale);
      const base = pickMessages(all, computed.base);

      const check = (label: string, delivered: Record<string, unknown>, required: string[]) => {
        for (const path of required) {
          // Required paths that exist in the catalogue must be present in what was sent.
          if (lookup(all, path) !== undefined)
            expect(
              lookup(delivered, path),
              `${locale} ${label} is missing ${path}`,
            ).not.toBeUndefined();
        }
      };

      // Every path named in the list exists in the catalogue (a typo would silently send nothing).
      for (const p of [
        ...computed.base,
        ...Object.values(computed.groups).flat(),
        ...Object.values(computed.areas).flat(),
      ])
        expect(lookup(all, p), `${locale} ${p} is not in messages/`).not.toBeUndefined();

      for (const [area, required] of Object.entries(needs.areas)) {
        const group = Object.keys(computed.groups).find((g) => area.startsWith(`${g}/`));
        let delivered = base;
        if (group) {
          delivered = mergeMessages(delivered, pickMessages(all, computed.groups[group]));
          check(`${group} shell`, delivered, needs.groups[group]);
        }
        delivered = mergeMessages(delivered, pickMessages(all, computed.areas[area]));
        // A page reads its own area plus its shell plus the root.
        check(area, delivered, [...required, ...computed.base]);
      }

      const size = (t: unknown) => JSON.stringify(t).length;
      const worst = Math.max(
        ...Object.keys(computed.areas).map((area) => {
          const group = Object.keys(computed.groups).find((g) => area.startsWith(`${g}/`));
          let d = base;
          if (group) d = mergeMessages(d, pickMessages(all, computed.groups[group]));
          return size(mergeMessages(d, pickMessages(all, computed.areas[area])));
        }),
      );
      expect(worst).toBeLessThan(size(all) * 0.6);
    });
  }

  it("merge keeps the parent's keys and lets the area add to a shared namespace", () => {
    const merged = mergeMessages({ a: { x: "1" }, b: "p" }, { a: { y: "2" } });
    expect(merged).toEqual({ a: { x: "1", y: "2" }, b: "p" });
    expect(pickMessages({ a: { x: "1", y: "2" }, b: "p" }, ["a.y", "zzz"])).toEqual({
      a: { y: "2" },
    });
  });
});
