import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { clampRiskScore, riskBandForScore, type RiskBand } from "@/lib/risk";

/**
 * Fill alpha is per-band, not one shared value: measured WCAG contrast
 * (text-risk-* at full opacity against its own translucent bg-risk-* fill, blended
 * over --card — the actual rendered pixel, not text-vs-page-background in
 * isolation) showed the critical band's fill at the same /15 every other
 * band uses drops to 4.03:1, under the 4.5:1 AA text threshold — a real,
 * measured failure, not a style nit (critical is also the one band an
 * analyst least wants to misread under AA-borderline contrast). --risk-*
 * hex *values* are app/globals.css's, out of this task's scope to touch;
 * the fix that stays inside this file is a lighter fill for that one
 * band only. At 4% it measures 4.54:1, comfortably clearing 4.5:1 with
 * margin. Every other band already clears 4.5:1 at /15 (4.96–6.91:1) and
 * is left as-is. See task-2-report.md for the full numbers.
 */
const BAND_CLASSES: Record<RiskBand, string> = {
  minimal: "bg-risk-minimal/15 text-risk-minimal ring-risk-minimal/30",
  low: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  moderate: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
  high: "bg-risk-high/15 text-risk-high ring-risk-high/30",
  critical: "bg-risk-critical/[4%] text-risk-critical ring-risk-critical/30",
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
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
        BAND_CLASSES[band],
        className,
      )}
      data-slot="risk-badge"
      data-risk-band={band}
    >
      {showScore && <span className="font-data">{clamped}</span>}
      <span>{t(band)}</span>
    </span>
  );
}
