import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Release 2026-11-11 — WCAG AA contrast for `StatusBadge`'s tones in the
 * dark theme.
 *
 * This exists because one tone was genuinely failing and nothing caught
 * it. `StatusBadge` renders token-coloured text on a `/15` alpha fill of
 * *the same token* over `--card`, which is a pattern where a token that
 * looks fine as plain text can still fail: the fill lifts the background
 * toward the text colour. `negative` measured **4.01:1** against the 4.5
 * floor for small text.
 *
 * It also could not be fixed by thinning the fill. `--risk-critical` was
 * `#e14f4f`, which is only 4.69:1 directly on `--card`, so every possible
 * tint sat under that ceiling (/12 → 4.17, /10 → 4.26, /08 → 4.35). The
 * token itself had to move. It is now `oklch(0.68 0.21 25)`: same hue,
 * ramp separation from `--risk-high` preserved at 0.094 oklab against
 * 0.097 before, and `lib/risk.ts`'s band thresholds untouched.
 *
 * The test parses the real `globals.css` rather than hard-coding colours,
 * so changing a token is what makes it fail — which is the point.
 */

const GLOBALS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/**
 * The `.dark` block's own token values — the theme this test is about.
 *
 * Anchored on the `.dark {` *selector*, not on the first occurrence of the
 * substring ".dark". An earlier version of this helper used
 * `indexOf(".dark")`, which matched a mention of `.dark` inside this
 * file's own header comment and therefore sliced from *above* `:root` —
 * so every lookup returned the **light** value while the test reported
 * itself as measuring dark. It passed, against the wrong palette, and
 * would not have caught the failure this file exists for.
 */
function darkToken(name: string): string {
  const selector = /^\.dark\s*\{/m.exec(GLOBALS);
  if (!selector || selector.index === undefined) {
    throw new Error("Could not locate the `.dark {` rule in globals.css");
  }
  const darkBlock = GLOBALS.slice(selector.index);
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(darkBlock);
  if (!match) throw new Error(`--${name} not found in the .dark block`);
  return match[1].trim();
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: number[]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: number[], b: number[]): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite `fg` at `alpha` over `bg` — exactly what a `/15` Tailwind fill does. */
function composite(fg: number[], bg: number[], alpha: number): number[] {
  return fg.map((channel, i) => Math.round(channel * alpha + bg[i] * (1 - alpha)));
}

function parseHex(value: string): number[] {
  const hex = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** oklch() → sRGB, so tokens can be written in either notation. */
function parseOklch(value: string): number[] {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value);
  if (!match) throw new Error(`Not an oklch() value: ${value}`);
  const [L, C, hDeg] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b2 = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b2;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const encode = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function toRgb(value: string): number[] {
  return value.startsWith("#") ? parseHex(value) : parseOklch(value);
}

/** sRGB -> oklab, for perceptual distance between two ramp bands. */
function toOklab(rgb: number[]): number[] {
  const [r, g, b] = rgb.map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabDistance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Mirrors `TONE_CLASSES` in components/manar/status-badge.tsx. */
const TONE_TOKENS: Record<string, string> = {
  positive: "state-safe",
  warning: "risk-moderate",
  negative: "risk-critical",
  info: "risk-low",
};

const AA_SMALL_TEXT = 4.5;
const FILL_ALPHA = 0.15;

describe("StatusBadge contrast (dark theme)", () => {
  const card = toRgb(darkToken("card"));

  it.each(Object.entries(TONE_TOKENS))(
    "the %s tone meets WCAG AA for small text on its own tinted fill",
    (tone, token) => {
      const foreground = toRgb(darkToken(token));
      const background = composite(foreground, card, FILL_ALPHA);
      const ratio = contrastRatio(foreground, background);

      expect(
        ratio,
        `${tone} (--${token}) measured ${ratio.toFixed(2)}:1, needs ${AA_SMALL_TEXT}:1`,
      ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    },
  );

  it("keeps every adjacent risk band perceptually distinguishable", () => {
    // Deliberately measured in oklab, not by contrast ratio. This ramp is
    // a HUE escalation (165 -> 135 -> 85 -> 45 -> 25) that holds luminance
    // roughly level on purpose, so no band shouts merely by being
    // brighter. Contrast ratio is a luminance metric and reports adjacent
    // bands as near-identical (critical vs high is 1.04:1) even when they
    // are obviously different colours — it is the wrong tool here.
    //
    // The floor is set from the ramp as it stands, so a future change that
    // collapses two bands together fails, while the existing deliberate
    // spacing passes.
    const ramp = ["risk-minimal", "risk-low", "risk-moderate", "risk-high", "risk-critical"];
    const points = ramp.map((token) => toOklab(toRgb(darkToken(token))));

    for (let i = 1; i < points.length; i += 1) {
      const separation = oklabDistance(points[i - 1], points[i]);
      expect(
        separation,
        `${ramp[i - 1]} and ${ramp[i]} are ${separation.toFixed(3)} apart in oklab — too close to tell apart at a glance`,
      ).toBeGreaterThan(0.05);
    }
  });

  it("did not let critical drift into high when its lightness was raised", () => {
    // The specific regression risk of the fix in this file: raising
    // --risk-critical's lightness moves it toward --risk-high. Separation
    // was 0.097 before the change and must not have materially shrunk.
    const separation = oklabDistance(
      toOklab(toRgb(darkToken("risk-critical"))),
      toOklab(toRgb(darkToken("risk-high"))),
    );

    expect(separation).toBeGreaterThan(0.085);
  });
});
