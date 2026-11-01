import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Status and risk badge contrast, measured from app/globals.css itself (Midnight palette).
 *
 * Badges render a status token as text on its soft token (bg-allow-soft text-allow, and so
 * on), the critical risk band renders --deny-text on solid --deny, and buttons carry a
 * Midnight label on blue (--brand-text on --brand). Link and accent text (--blue-text,
 * --orange-text) must read on the page and on cards. Every pair must meet WCAG AA for
 * small text (4.5:1) in both themes. The risk bands map onto the status tokens
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
  ["critical (solid)", "deny-text", "deny"],
  ["primary button", "brand-text", "brand"],
  ["orange fill label", "brand-text", "orange"],
  ["destructive button", "deny-text", "deny"],
  ["body on page", "text", "page"],
  ["body on surface", "text", "surface"],
  ["muted on page", "muted-text", "page"],
  ["muted on surface", "muted-text", "surface"],
  ["blue text on page", "blue-text", "page"],
  ["blue text on surface", "blue-text", "surface"],
  ["orange text on page", "orange-text", "page"],
  ["orange text on surface", "orange-text", "surface"],
  ["deny on page", "deny", "page"],
  ["deny on surface", "deny", "surface"],
  ["report text", "report-text", "report-bg"],
  ["report muted", "report-muted", "report-bg"],
  ["report blue", "report-blue", "report-bg"],
  ["report orange", "report-orange", "report-bg"],
  ["report red", "report-red", "report-bg"],
];

/** Non-text contrast (WCAG 1.4.11, 3:1): control borders and the focus ring. */
const NON_TEXT: Array<[string, string, string]> = [
  ["control border on page", "line-strong", "page"],
  ["control border on surface", "line-strong", "surface"],
  ["focus ring on page", "focus", "page"],
  ["focus ring on surface", "focus", "surface"],
];

describe.each(["light", "dark"] as const)("badge contrast (%s theme)", (theme) => {
  it.each(PAIRS)("%s text meets WCAG AA on its fill", (_label, text, fill) => {
    const ratio = contrast(token(text, theme), token(fill, theme));
    expect(ratio, `${text} on ${fill}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(["light", "dark"] as const)("non-text contrast (%s theme)", (theme) => {
  it.each(NON_TEXT)("%s is at least 3:1", (_label, fg, bg) => {
    const ratio = contrast(token(fg, theme), token(bg, theme));
    expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });
});

describe("Midnight palette", () => {
  it("keeps the approved brand values", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(token("brand", theme)).toBe("#0297de");
      expect(token("orange", theme)).toBe("#fc734d");
      expect(token("brand-text", theme)).toBe("#02070a");
    }
    expect(token("blue-text", "light")).toBe("#0277b6");
    expect(token("orange-text", "light")).toBe("#b4451f");
    expect(token("deny", "dark")).toBe("#ff5470");
    expect(token("deny", "light")).toBe("#c8102e");
    expect(token("page", "dark")).toBe("#02070a");
  });

  it("maps allow to blue and wait to orange", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(token("allow", theme)).toBe(token("blue-text", theme));
      expect(token("wait", theme)).toBe(token("orange-text", theme));
    }
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
