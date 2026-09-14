import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The density contract, asserted against app/globals.css itself.
 *
 * jsdom has no layout engine and no Tailwind pipeline, so a rendered
 * component cannot tell us how many CSS pixels a row or a button actually
 * occupies. What it CAN do — and what actually matters here — is read the
 * stylesheet that is the single source of truth for those numbers and
 * check the arithmetic: the brief's row-height targets, and WCAG 2.2
 * SC 2.5.8's 24x24 CSS-pixel pointer-target floor, which compact must not
 * be allowed to erode.
 *
 * (Real rendered geometry was additionally measured in a browser — see
 * the task report — but that is not something a unit test can regress on,
 * and this is: change a token in globals.css and this fails.)
 */

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

/** Browser default root font size, which the percentage roots below are
 * relative to. */
const BROWSER_DEFAULT_PX = 16;

/** Returns the body of the `selector { ... }` rule. `:root` appears more
 * than once in this stylesheet (the palette block and the density block
 * are deliberately separate), so `marker` picks the intended one. */
function block(selector: string, marker?: string): string {
  let from = 0;
  for (;;) {
    const index = CSS.indexOf(selector + " {", from);
    expect(index, `selector ${selector} not found in app/globals.css`).toBeGreaterThan(-1);
    const start = CSS.indexOf("{", index);
    let depth = 0;
    for (let i = start; i < CSS.length; i++) {
      if (CSS[i] === "{") depth++;
      else if (CSS[i] === "}") {
        depth--;
        if (depth === 0) {
          const body = CSS.slice(start + 1, i);
          if (!marker || body.includes(marker)) return body;
          from = i;
          break;
        }
      }
    }
    if (depth !== 0) throw new Error(`unterminated block for ${selector}`);
  }
}

function declaration(body: string, property: string): string | null {
  const match = body.match(new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

/** Resolves a token value to CSS pixels. Handles the two forms the
 * density tokens actually use: a bare rem length, and
 * `max(<rem>, var(--target-min-size))`. */
function toPx(value: string, rootPx: number, targetMinPx: number): number {
  const maxMatch = value.match(/^max\(\s*([\d.]+)rem\s*,\s*var\(--target-min-size\)\s*\)$/);
  if (maxMatch) return Math.max(Number(maxMatch[1]) * rootPx, targetMinPx);
  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return Number(remMatch[1]) * rootPx;
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return Number(pxMatch[1]);
  throw new Error(`unhandled token value: ${value}`);
}

const root = block(":root", "--target-min-size");
const compact = block('html[data-density="compact"]');
const baseHtml = CSS.match(/html\s*\{\s*font-size:\s*([\d.]+)%;\s*\}/);
const compactHtml = CSS.match(/html\[data-density="compact"\]\s*\{\s*font-size:\s*([\d.]+)%;\s*\}/);

const TARGET_MIN_PX = Number(declaration(root, "--target-min-size")!.replace("px", ""));
const COMFORTABLE_ROOT_PX = (Number(baseHtml![1]) / 100) * BROWSER_DEFAULT_PX;
const COMPACT_ROOT_PX = (Number(compactHtml![1]) / 100) * BROWSER_DEFAULT_PX;

/** Every token whose value is a pointer-target dimension. */
const TARGET_TOKENS = ["--density-row-height", "--density-head-height"];

describe("density token contract (app/globals.css)", () => {
  it("declares exactly two densities, with comfortable as the attribute-less default", () => {
    // The comfortable values live on :root, so a document that never gets
    // a data-density attribute still renders a complete, valid density.
    for (const token of TARGET_TOKENS) {
      expect(declaration(root, token), `${token} must be defined on :root`).toBeTruthy();
    }
    expect(CSS).toContain('html[data-density="compact"]');
    expect(CSS).not.toContain('data-density="cosy"');
  });

  it("uses a percentage root font size, not a fixed px one (WCAG 1.4.4)", () => {
    // A px root silently overrides the reader's own browser font-size
    // setting. This console used `font-size: 14px` before the density work.
    expect(baseHtml, "html { font-size: <pct>% } not found").not.toBeNull();
    expect(compactHtml).not.toBeNull();
    expect(CSS).not.toMatch(/html\s*\{\s*font-size:\s*\d+px/);
  });

  it("hits the brief's base-text targets in both densities", () => {
    // Comfortable ~16px base text; compact must stay readable, not shrink
    // the type scale on top of the smaller root.
    expect(COMFORTABLE_ROOT_PX).toBe(16);
    expect(COMPACT_ROOT_PX).toBe(14);

    const themeBlock = block("@theme inline");
    const textSm = Number(declaration(themeBlock, "--text-sm")!.replace("rem", ""));
    const textBase = Number(declaration(themeBlock, "--text-base")!.replace("rem", ""));

    // Common content (table cells, most body copy) is --text-sm.
    expect(textSm * COMFORTABLE_ROOT_PX).toBeGreaterThanOrEqual(13);
    expect(textSm * COMFORTABLE_ROOT_PX).toBeLessThanOrEqual(16);
    expect(textBase * COMFORTABLE_ROOT_PX).toBe(16);
    // Compact stays at the density this console already shipped. The
    // 0.05px slack absorbs the rem tokens' 4-decimal rounding (--text-sm
    // is 0.8571rem, i.e. 11.9994px rather than a dead-on 12px).
    expect(textSm * COMPACT_ROOT_PX).toBeGreaterThanOrEqual(12 - 0.05);
    expect(textBase * COMPACT_ROOT_PX).toBeGreaterThanOrEqual(14 - 0.05);
  });

  it("hits the brief's row-height targets: 44-48px comfortable, ~36px compact", () => {
    const comfortableRow = toPx(
      declaration(root, "--density-row-height")!,
      COMFORTABLE_ROOT_PX,
      TARGET_MIN_PX,
    );
    const compactRow = toPx(
      declaration(compact, "--density-row-height")!,
      COMPACT_ROOT_PX,
      TARGET_MIN_PX,
    );

    expect(comfortableRow).toBeGreaterThanOrEqual(44);
    expect(comfortableRow).toBeLessThanOrEqual(48);
    expect(compactRow).toBeGreaterThanOrEqual(35);
    expect(compactRow).toBeLessThanOrEqual(37);
    // Compact must actually be denser, or the preference is decorative.
    expect(compactRow).toBeLessThan(comfortableRow);
  });

  it("keeps the WCAG 2.2 SC 2.5.8 24x24 floor in BOTH densities", () => {
    expect(TARGET_MIN_PX).toBe(24);
    // The floor is an absolute input-device minimum, so it must not be
    // re-declared (and therefore cannot be scaled) inside compact.
    expect(declaration(compact, "--target-min-size")).toBeNull();
    expect(declaration(root, "--target-min-size")).toMatch(/px$/);

    for (const token of TARGET_TOKENS) {
      const comfortableValue = declaration(root, token)!;
      const compactValue = declaration(compact, token) ?? comfortableValue;

      // Structural: the floor is baked into the token, so it survives any
      // call site that forgets about it.
      expect(comfortableValue, `${token} (comfortable)`).toContain("var(--target-min-size)");
      expect(compactValue, `${token} (compact)`).toContain("var(--target-min-size)");

      // Numeric: and it actually computes to >= 24px at each root size.
      expect(toPx(comfortableValue, COMFORTABLE_ROOT_PX, TARGET_MIN_PX)).toBeGreaterThanOrEqual(24);
      expect(toPx(compactValue, COMPACT_ROOT_PX, TARGET_MIN_PX)).toBeGreaterThanOrEqual(24);
    }
  });

  it("applies the target floor to every Button and menu item, not just density-aware ones", () => {
    // components/ui/button.tsx's `xs`/`icon-xs` sizes compute to 21px at
    // compact's 14px root; this base rule is what lifts them to 24px
    // without a structural edit to the primitive.
    const floorRule = CSS.match(
      /\[data-slot="button"\],\s*\[data-slot="dropdown-menu-item"\],\s*\[data-slot="dropdown-menu-radio-item"\],\s*\[data-slot="dropdown-menu-checkbox-item"\]\s*\{\s*min-block-size:\s*var\(--target-min-size\);\s*\}/,
    );
    expect(floorRule, "shared min-block-size floor rule missing").not.toBeNull();
    expect(CSS).toMatch(
      /\[data-slot="button"\]\s*\{\s*min-inline-size:\s*var\(--target-min-size\);\s*\}/,
    );
  });
});
