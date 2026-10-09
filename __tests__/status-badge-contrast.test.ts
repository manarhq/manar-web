import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Status and risk badge contrast, measured from app/globals.css itself.
 *
 * Badges render a status token as text on its soft token (bg-allow-soft text-allow, and so
 * on), and the critical risk band renders --brand-text on solid --deny. Every pair must meet
 * WCAG AA for small text (4.5:1) in both themes. The risk bands map onto the status tokens
 * (minimal neutral, low allow, moderate wait, high and critical deny); critical is told apart
 * from high by its fill and icon, not by hue.
 *
 * The test parses the real stylesheet and follows var() references, so changing a token is
 * what makes it fail.
 */

const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function block(selector: RegExp): string {
  const match = selector.exec(CSS);
  if (!match) throw new Error(`block ${selector} not found`);
  const start = CSS.indexOf("{", match.index);
  let depth = 0;
  for (let i = start; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}" && --depth === 0) return CSS.slice(start + 1, i);
  }
  throw new Error("unterminated block");
}

const LIGHT = block(/^:root\s*\{/m);
const DARK = block(/^\.dark\s*\{/m);

function declared(body: string, name: string): string | null {
  const match = new RegExp(`(?:^|[;{\\s])--${name}:\\s*([^;]+);`).exec(body);
  return match ? match[1].trim() : null;
}

/** Resolves a token for a theme, following var(--x) chains (dark falls back to :root). */
function token(name: string, theme: "light" | "dark"): string {
  const raw = (theme === "dark" ? declared(DARK, name) : null) ?? declared(LIGHT, name);
  if (!raw) throw new Error(`--${name} not declared`);
  const ref = /^var\(--([\w-]+)\)$/.exec(raw);
  return ref ? token(ref[1], theme) : raw.toLowerCase();
}

function rgb(hex: string): number[] {
  if (!/^#[0-9a-f]{6}$/.test(hex)) throw new Error(`not a 6-digit hex: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mirrors the text/fill pairs in status-badge.tsx, risk-badge.tsx and components/ui/badge.tsx. */
const PAIRS: Array<[string, string, string]> = [
  ["allow", "allow", "allow-soft"],
  ["wait", "wait", "wait-soft"],
  ["deny", "deny", "deny-soft"],
  ["neutral", "muted-text", "subtle"],
  ["critical (solid)", "brand-text", "deny"],
];

describe.each(["light", "dark"] as const)("badge contrast (%s theme)", (theme) => {
  it.each(PAIRS)("%s text meets WCAG AA on its fill", (_label, text, fill) => {
    const ratio = contrast(token(text, theme), token(fill, theme));
    expect(ratio, `${text} on ${fill}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

describe("risk bands use the status tokens", () => {
  it.each(["light", "dark"] as const)("maps every band in the %s theme", (theme) => {
    expect(token("risk-minimal", theme)).toBe(token("muted-text", theme));
    expect(token("risk-low", theme)).toBe(token("allow", theme));
    expect(token("risk-moderate", theme)).toBe(token("wait", theme));
    expect(token("risk-high", theme)).toBe(token("deny", theme));
    expect(token("risk-critical", theme)).toBe(token("deny", theme));
  });
});
