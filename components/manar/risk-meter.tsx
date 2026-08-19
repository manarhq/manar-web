import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { clampRiskScore, riskBandForScore, RISK_BANDS, type RiskBand } from "@/lib/risk";

const BAND_BG: Record<RiskBand, string> = {
  minimal: "bg-risk-minimal",
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
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

/**
 * Manar's signature risk-score treatment: a five-segment ramp (one segment
 * per band, see lib/risk.ts) with the active band's segment lit and a
 * position marker, plus the raw score in large tabular type. Meant for
 * detail contexts (agent/task/policy headers) where RiskBadge (the compact
 * table-cell pill) would be too small to read at a glance.
 */
export function RiskMeter({ score, className, label }: RiskMeterProps) {
  const t = useTranslations("risk");
  const clamped = clampRiskScore(score);
  const band = riskBandForScore(clamped);

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-slot="risk-meter">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-2xl leading-none font-semibold tabular-nums",
            BAND_TEXT[band],
          )}
        >
          {clamped}
        </span>
        <span className={cn("text-xs font-medium uppercase tracking-wide", BAND_TEXT[band])}>
          {t(band)}
        </span>
      </div>
      <div
        className="flex h-1.5 gap-0.5"
        role="img"
        aria-label={t("meterLabel", { score: clamped, band: t(band) })}
      >
        {RISK_BANDS.map((b) => (
          <div
            key={b.band}
            className={cn(
              "flex-1 rounded-full transition-opacity",
              BAND_BG[b.band],
              b.band === band ? "opacity-100" : "opacity-20",
            )}
          />
        ))}
      </div>
    </div>
  );
}
