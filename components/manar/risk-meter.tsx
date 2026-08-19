import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { clampRiskScore, riskBandForScore, RISK_BANDS, type RiskBand } from "@/lib/risk";

const BAND_STROKE: Record<RiskBand, string> = {
  minimal: "var(--color-risk-minimal)",
  low: "var(--color-risk-low)",
  moderate: "var(--color-risk-moderate)",
  high: "var(--color-risk-high)",
  critical: "var(--color-risk-critical)",
};

const BAND_TEXT: Record<RiskBand, string> = {
  minimal: "text-risk-minimal",
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  critical: "text-risk-critical",
};

export interface RiskMeterProps {
  score: number;
  className?: string;
  /** Optional label above the meter, e.g. an agent or task name. */
  label?: string;
}

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;
const STROKE = 14;

/** Angle convention: 180deg = leftmost point (score 0), 0deg = rightmost
 * point (score 100), sweeping clockwise over the top — a standard
 * half-donut gauge. */
function pointAt(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function scoreToAngle(score: number) {
  const bounded = Math.min(100, Math.max(0, score));
  return 180 - (bounded / 100) * 180;
}

function arcPath(startScore: number, endScore: number, radius: number) {
  const startAngle = scoreToAngle(startScore);
  const endAngle = scoreToAngle(endScore);
  const start = pointAt(startAngle, radius);
  const end = pointAt(endAngle, radius);
  const largeArc = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Manar's signature risk-score treatment (design-rework.md's "Signature
 * element"): this product's one job is assessing and gating risk, so the
 * risk score gets a real, deliberate gauge — a half-donut arc with each
 * of lib/risk.ts's five bands drawn as its own colored segment (sized to
 * its real min/max span, not evenly), a needle marking the exact score,
 * and light divider notches at every band boundary so the thresholds
 * that matter (20/40/60/80) are visible on the instrument itself, not
 * just implied by color. Replaces the previous flat 5-segment opacity
 * bar. Band *thresholds* are unchanged — lib/risk.ts is still the only
 * source of truth for where one band ends and the next begins.
 */
export function RiskMeter({ score, className, label }: RiskMeterProps) {
  const t = useTranslations("risk");
  const clamped = clampRiskScore(score);
  const band = riskBandForScore(clamped);
  const needleAngle = scoreToAngle(clamped);
  const needleTip = pointAt(needleAngle, R + STROKE / 2 + 2);
  const needleBase = pointAt(needleAngle, R - STROKE / 2 - 6);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} data-slot="risk-meter">
      {label && <span className="self-start text-xs text-muted-foreground">{label}</span>}
      <div
        className="relative"
        style={{ width: SIZE, height: SIZE / 2 + 44 }}
        role="img"
        aria-label={t("meterLabel", { score: clamped, band: t(band) })}
      >
        <svg
          width={SIZE}
          height={SIZE / 2 + 20}
          viewBox={`0 0 ${SIZE} ${SIZE / 2 + 20}`}
          className="overflow-visible"
        >
          {RISK_BANDS.map((b) => (
            <path
              key={b.band}
              d={arcPath(b.min, b.max + 1, R)}
              fill="none"
              stroke={BAND_STROKE[b.band]}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              opacity={b.band === band ? 1 : 0.35}
            />
          ))}
          {/* Threshold notches at every band boundary (20/40/60/80) —
              the gauge's own tick marks, cut through the arc in the page
              background color so each band reads as a distinct segment. */}
          {RISK_BANDS.slice(1).map((b) => {
            const inner = pointAt(scoreToAngle(b.min), R - STROKE / 2 - 1);
            const outer = pointAt(scoreToAngle(b.min), R + STROKE / 2 + 1);
            return (
              <line
                key={`notch-${b.min}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--color-background)"
                strokeWidth={2}
              />
            );
          })}
          {/* Needle: pivots from the arc's baseline, pointing at the
              exact score within its band. */}
          <line
            x1={needleBase.x}
            y1={needleBase.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--color-foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={3} fill="var(--color-foreground)" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pt-2">
          <span
            className={cn(
              "font-mono text-3xl leading-none font-semibold tabular-nums",
              BAND_TEXT[band],
            )}
          >
            {clamped}
          </span>
          <span className={cn("mt-1 text-xs font-medium", BAND_TEXT[band])}>{t(band)}</span>
        </div>
      </div>
    </div>
  );
}
