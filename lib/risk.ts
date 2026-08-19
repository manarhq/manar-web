/**
 * Manar's risk-score visual language (Section 58 of the Phase 11a design
 * spec): every risk-bearing resource in the product — agents, tasks,
 * policies, approvals, incidents — surfaces a single 0-100 risk score, and
 * that score always maps to the same five bands and the same colors. This
 * module is the single source of truth for that mapping so no later phase
 * reinvents its own thresholds or palette.
 *
 * Bands intentionally mirror common SOC severity vocabulary (minimal /
 * low / moderate / high / critical) rather than a generic "low/medium/high"
 * three-step scale, since that's the vocabulary this product's actual
 * users (security operators) already carry from other tooling.
 */

export type RiskBand = "minimal" | "low" | "moderate" | "high" | "critical";

export interface RiskBandDefinition {
  band: RiskBand;
  /** Inclusive lower bound of this band, 0-100. */
  min: number;
  /** Inclusive upper bound of this band, 0-100. */
  max: number;
}

export const RISK_BANDS: readonly RiskBandDefinition[] = [
  { band: "minimal", min: 0, max: 19 },
  { band: "low", min: 20, max: 39 },
  { band: "moderate", min: 40, max: 59 },
  { band: "high", min: 60, max: 79 },
  { band: "critical", min: 80, max: 100 },
];

/** Translation-key suffixes for each band; see messages/{locale}/risk.json. */
export const RISK_BAND_LABEL_KEY: Record<RiskBand, string> = {
  minimal: "minimal",
  low: "low",
  moderate: "moderate",
  high: "high",
  critical: "critical",
};

export function clampRiskScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function riskBandForScore(score: number): RiskBand {
  const clamped = clampRiskScore(score);
  const match = RISK_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  // RISK_BANDS covers the full 0-100 range; this fallback only matters if
  // that invariant is ever broken.
  return match?.band ?? "critical";
}

/** Tailwind color token classes for a given band, keyed to the
 * --color-risk-* CSS variables defined in app/globals.css. */
export const RISK_BAND_COLOR_VAR: Record<RiskBand, string> = {
  minimal: "var(--color-risk-minimal)",
  low: "var(--color-risk-low)",
  moderate: "var(--color-risk-moderate)",
  high: "var(--color-risk-high)",
  critical: "var(--color-risk-critical)",
};
