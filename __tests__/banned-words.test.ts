/**
 * Banned vocabulary in user-facing strings (MANAR-BUILD-SPEC.md §1.6 rule 4).
 *
 * Scans every message value in both locales, and string literals and JSX text in
 * app/ and components/ after comments are stripped. Message keys are not scanned:
 * a key name never reaches the screen.
 *
 * The workspace script scripts/check-banned-words.sh carries the same list for docs/;
 * keep the two in sync.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const BANNED =
  /\b(immutable|unhackable|tamper[- ]?proof|100% safe|provably safe|physically impossible|guaranteed)\b/i;

const root = join(__dirname, "..");

function walk(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, exts);
    return exts.some((ext) => name.endsWith(ext)) ? [path] : [];
  });
}

function messageValues(node: unknown, key = ""): Array<[string, string]> {
  if (typeof node === "string") return [[key, node]];
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => messageValues(v, key ? `${key}.${k}` : k));
  }
  return [];
}

function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

describe("banned vocabulary", () => {
  it("the pattern catches every banned term and spares the approved ones", () => {
    for (const bad of [
      "immutable",
      "Unhackable",
      "tamper-proof",
      "tamperproof",
      "100% safe",
      "provably safe",
      "physically impossible",
      "guaranteed",
    ]) {
      expect(BANNED.test(`the log is ${bad}`), bad).toBe(true);
    }
    for (const ok of [
      "tamper-evident",
      "versioned",
      "reproducible",
      "verifiable",
      "versionsImmutableNote",
      "the guarantee is structural",
    ]) {
      expect(BANNED.test(ok), ok).toBe(false);
    }
  });

  it("comment stripping removes comments and keeps string content", () => {
    const src = `// guaranteed\n/* immutable */\nconst a = "https://x"; {/* tamper-proof */}`;
    expect(BANNED.test(stripComments(src))).toBe(false);
    expect(stripComments(src)).toContain('"https://x"');
  });

  it("no message value in any locale uses banned vocabulary", () => {
    const hits = walk(join(root, "messages"), [".json"]).flatMap((file) =>
      messageValues(JSON.parse(readFileSync(file, "utf8")))
        .filter(([, value]) => BANNED.test(value))
        .map(([key, value]) => `${relative(root, file)} ${key}: ${value}`),
    );
    expect(hits).toEqual([]);
  });

  it("no string literal or JSX text in app/ or components/ uses banned vocabulary", () => {
    const hits = [
      ...walk(join(root, "app"), [".ts", ".tsx"]),
      ...walk(join(root, "components"), [".ts", ".tsx"]),
    ].flatMap((file) =>
      stripComments(readFileSync(file, "utf8"))
        .split("\n")
        .filter((line) => BANNED.test(line))
        .map((line) => `${relative(root, file)}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });
});
