/**
 * Design system guards (docs/design/DESIGN-SYSTEM.md in the workspace repo).
 *
 * Rule 10: Phosphor is the only icon set. components/ui is migrated; pages still import
 * lucide-react until phase 2, so this guard covers components/ui only for now.
 *
 * Rule 15: no em or en dashes in anything a user sees, so no message value in either
 * locale may contain U+2013 or U+2014.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, ext);
    return name.endsWith(ext) ? [path] : [];
  });
}

function messageValues(node: unknown, key = ""): Array<[string, string]> {
  if (typeof node === "string") return [[key, node]];
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => messageValues(v, key ? `${key}.${k}` : k));
  }
  return [];
}

describe("design system guards", () => {
  it("components/ui imports no lucide-react icons", () => {
    const offenders = walk(join(root, "components", "ui"), ".tsx")
      .filter((file) => /from\s+["']lucide-react["']/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("no message value in any locale contains an em or en dash", () => {
    const hits = walk(join(root, "messages"), ".json").flatMap((file) =>
      messageValues(JSON.parse(readFileSync(file, "utf8")))
        .filter(([, value]) => /[–—]/.test(value))
        .map(([key]) => `${relative(root, file)} ${key}`),
    );
    expect(hits).toEqual([]);
  });
});
