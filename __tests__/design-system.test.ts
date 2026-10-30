/**
 * Design system guards (docs/design/DESIGN-SYSTEM.md in the workspace repo).
 *
 * Rule 10: Phosphor is the only icon set. No source file imports lucide-react, and it is
 * not a dependency.
 *
 * Fonts: Readex Pro (Latin and Arabic) and JetBrains Mono; IBM Plex is gone.
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
  it("no source file imports lucide-react, and it is not a dependency", () => {
    const offenders = ["app", "components", "hooks", "lib"]
      .flatMap((dir) => walk(join(root, dir), ".ts").concat(walk(join(root, dir), ".tsx")))
      .filter((file) => /from\s+["']lucide-react["']/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);

    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty("lucide-react");
  });

  it("fonts are Readex Pro and JetBrains Mono, not IBM Plex", () => {
    const layout = readFileSync(join(root, "app/[locale]/layout.tsx"), "utf8");
    expect(layout).toMatch(/Readex_Pro/);
    expect(layout).toMatch(/JetBrains_Mono/);
    const css = readFileSync(join(root, "app/globals.css"), "utf8");
    const offenders = [layout, css].filter((src) => /IBM_Plex|font-plex/.test(src));
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
