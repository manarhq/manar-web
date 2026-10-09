import type { AiSystemCoverage, AiSystemCoverageValue } from "@/hooks/use-ai-systems";

/**
 * How this console renders `AiSystemCoverageDto.coverage`.
 *
 * Coverage is **not a quality ramp** and must never be drawn as one. The
 * four values answer different questions, and one of them is not an
 * answer at all:
 *
 * | value | means |
 * | --- | --- |
 * | `GOVERNED` | a linked agent is ACTIVE *and* there is a real observation inside the window — Manar both enforces and sees this system. |
 * | `OBSERVED_ONLY` | real recent activity, but no ACTIVE linked agent — Manar sees it and is not enforcing through any active principal this record names. |
 * | `DECLARED_ONLY` | no observation inside the window (including the common "nothing linked yet" case). The record is a declaration and nothing more. |
 * | `MONITORING_UNAVAILABLE` | **the observation source could not be consulted.** The platform does not know. |
 *
 * Two rules drive every choice in this file:
 *
 * 1. **`MONITORING_UNAVAILABLE` may never read as "no activity" or as a
 *    calm neutral state.** It is the loudest of the four and is separated
 *    from `DECLARED_ONLY` on six independent axes — colour, border style,
 *    background texture, icon, label, and the explanation body — so it
 *    survives greyscale, colour-blindness, and a tired 3am glance.
 * 2. **None of the risk-ramp colours (`--risk-minimal`..`--risk-critical`)
 *    appear here.** Risk and coverage are different concepts and the
 *    project rules reserve that ramp. `GOVERNED` uses `--state-safe`,
 *    which is reserved for exactly "verified / active" and is precisely
 *    what `GOVERNED` asserts; `OBSERVED_ONLY` uses the neutral signal-blue
 *    accent; `DECLARED_ONLY` is plain muted; `MONITORING_UNAVAILABLE`
 *    uses `--destructive`, which means "something failed" — here the
 *    platform's own ability to observe, not the record.
 *
 * Fill opacities below are measured, not picked by eye: each pairing was
 * checked against WCAG AA for normal text on `--card` in the dark palette
 * (GOVERNED 6.0:1, OBSERVED_ONLY 5.0:1, DECLARED_ONLY 6.7:1,
 * MONITORING_UNAVAILABLE 4.6:1, and 5.2:1 where a hatch stripe falls
 * behind a glyph — see `COVERAGE_HATCH_STYLE`).
 *
 * This module is deliberately React-free so the derivation is unit
 * testable on its own (`__tests__/ai-systems-coverage.test.tsx`).
 */

export const COVERAGE_VALUES = [
  "GOVERNED",
  "OBSERVED_ONLY",
  "DECLARED_ONLY",
  "MONITORING_UNAVAILABLE",
] as const satisfies readonly AiSystemCoverageValue[];

/** The named visual family a coverage value belongs to. Exposed on the
 * DOM as `data-coverage-surface` so tests (and anyone inspecting the
 * page) can see the four are genuinely four, not a shared ramp. */
export type CoverageSurface = "verified" | "observed" | "declared" | "unknown";

export interface CoveragePresentation {
  surface: CoverageSurface;
  /** Tailwind classes for the pill/panel chrome — fill, text colour and
   * the border treatment together. Never a `--risk-*` token. */
  className: string;
  /** The non-colour half of the encoding: `DECLARED_ONLY` is the only
   * dashed one ("nothing observed"), everything else is solid. */
  border: "solid" | "dashed";
  /**
   * Diagonal hatching, applied to `MONITORING_UNAVAILABLE` alone. A hatch
   * is the long-standing "instrument offline / no reading" convention and
   * is the cue that still works with colour removed entirely.
   */
  hatched: boolean;
}

const PRESENTATION: Record<AiSystemCoverageValue, CoveragePresentation> = {
  GOVERNED: {
    surface: "verified",
    className: "border border-solid border-transparent bg-allow-soft text-allow",
    border: "solid",
    hatched: false,
  },
  OBSERVED_ONLY: {
    surface: "observed",
    className: "border border-solid border-transparent bg-wait-soft text-wait",
    border: "solid",
    hatched: false,
  },
  DECLARED_ONLY: {
    surface: "declared",
    className: "border border-dashed border-line-strong bg-subtle text-muted-foreground",
    border: "dashed",
    hatched: false,
  },
  MONITORING_UNAVAILABLE: {
    surface: "unknown",
    className: "border border-solid border-transparent bg-deny-soft text-deny",
    border: "solid",
    hatched: true,
  },
};

export function coveragePresentation(value: AiSystemCoverageValue): CoveragePresentation {
  return PRESENTATION[value];
}

/**
 * The hatch fill for `MONITORING_UNAVAILABLE`, as an inline style rather
 * than a utility class because `app/globals.css` is owned by another
 * workstream this release and a repeating-gradient token cannot be added
 * to it. Purely decorative texture — it carries no direction, so it needs
 * no RTL variant, and it is static, so `prefers-reduced-motion` does not
 * apply.
 *
 * The stripes are the *page canvas* colour, not more `--destructive`.
 * That is a contrast decision, measured rather than guessed: striping in
 * the accent colour lifts the fill toward the text colour and drops the
 * `--destructive`-on-fill contrast to roughly 3.2:1 where a stripe sits
 * behind a glyph, which fails WCAG AA. Punching the canvas through the
 * fill instead moves the background *away* from the text in both themes
 * (measured ~5.2:1 in dark, higher in light), and reads more like an
 * instrument with no signal than a coloured warning stripe would.
 */
export const COVERAGE_HATCH_STYLE: Readonly<Record<string, string>> = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in oklch, var(--background) 62%, transparent) 5px 7px)",
};

/**
 * Whether the observation figures travelling alongside the verdict are
 * real measurements.
 *
 * This is the single most important rule in this file. manar-api zeroes
 * `observedAgentCount` and nulls `lastObservedAt` when
 * `MONITORING_UNAVAILABLE`, and says so explicitly: those are
 * "deliberately zeroed/nulled rather than partially reported ... any
 * observation figure would be an artefact of a failed query rather than a
 * measurement". Rendering that `0` as "0 agents observed", or that `null`
 * as "never observed", would restate an outage as a finding — the exact
 * failure this coverage vocabulary exists to prevent.
 */
export function observationFiguresAreMeasurements(value: AiSystemCoverageValue): boolean {
  return value !== "MONITORING_UNAVAILABLE";
}

/** One row of the "why this verdict" breakdown. `kind: "unavailable"`
 * means the figure exists in the payload but is not a measurement and
 * must be rendered as unknown, not as a number. */
export type CoverageFactKind = "count" | "timestamp" | "never" | "unavailable";

export interface CoverageFact {
  /** Key into `aiSystems.coverage.facts.*` in the message files. */
  key: "linkedAgents" | "activeLinkedAgents" | "observedAgents" | "lastObserved" | "window";
  kind: CoverageFactKind;
  count?: number;
  timestamp?: string;
}

/**
 * The evidence the API ships alongside the verdict, turned into an
 * ordered, honest list. `linkedAgentCount`/`activeLinkedAgentCount` come
 * from `Agent.status` rather than telemetry, so they stay real even when
 * the observation source is down; the observation figures do not.
 *
 * These exist so an operator can interrogate the verdict without a second
 * request — a bare badge nobody can question is the failure mode here.
 */
export function coverageFacts(coverage: AiSystemCoverage): CoverageFact[] {
  const measured = observationFiguresAreMeasurements(coverage.coverage);

  return [
    { key: "linkedAgents", kind: "count", count: coverage.linkedAgentCount },
    { key: "activeLinkedAgents", kind: "count", count: coverage.activeLinkedAgentCount },
    measured
      ? { key: "observedAgents", kind: "count", count: coverage.observedAgentCount }
      : { key: "observedAgents", kind: "unavailable" },
    measured
      ? coverage.lastObservedAt
        ? { key: "lastObserved", kind: "timestamp", timestamp: coverage.lastObservedAt }
        : { key: "lastObserved", kind: "never" }
      : { key: "lastObserved", kind: "unavailable" },
    { key: "window", kind: "count", count: coverage.observationWindowDays },
  ];
}
