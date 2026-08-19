import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { clampRiskScore, riskBandForScore, type RiskBand } from "@/lib/risk";

const BAND_CLASSES: Record<RiskBand, string> = {
  minimal: "bg-risk-minimal/15 text-risk-minimal ring-risk-minimal/30",
  low: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  moderate: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
  high: "bg-risk-high/15 text-risk-high ring-risk-high/30",
  critical: "bg-risk-critical/15 text-risk-critical ring-risk-critical/30",
};

export interface RiskBadgeProps {
  /** 0-100 risk score. */
  score: number;
  className?: string;
  /** Show the numeric score alongside the band label. Defaults to true. */
  showScore?: boolean;
}

/**
 * The one recurring risk-score treatment reused across agents, tasks,
 * policies, approvals, and incidents (Section 58). A compact pill: numeric
 * score in tabular figures + the band label, colored per lib/risk.ts's
 * shared band definitions — never a page-local color choice.
 */
export function RiskBadge({ score, className, showScore = true }: RiskBadgeProps) {
  const t = useTranslations("risk");
  const clamped = clampRiskScore(score);
  const band = riskBandForScore(clamped);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        BAND_CLASSES[band],
        className,
      )}
      data-slot="risk-badge"
      data-risk-band={band}
    >
      {showScore && <span className="font-mono tabular-nums">{clamped}</span>}
      <span>{t(band)}</span>
    </span>
  );
}
