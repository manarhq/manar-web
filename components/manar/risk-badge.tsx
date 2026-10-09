import { useTranslations } from "next-intl";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";

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
// Bands use the status tokens: minimal neutral, low allow, moderate wait, high and
// critical deny. Critical is told apart from high by a solid fill and a filled octagon,
// so the difference never rests on colour alone.
const BAND_CLASSES: Record<RiskBand, string> = {
  minimal: "bg-subtle text-muted-foreground",
  low: "bg-allow-soft text-allow",
  moderate: "bg-wait-soft text-wait",
  high: "bg-deny-soft text-deny",
  critical: "bg-deny text-brand-text",
};

const BAND_ICONS: Record<RiskBand, { icon: PhosphorIcon; weight: "bold" | "fill" }> = {
  minimal: { icon: InfoIcon, weight: "bold" },
  low: { icon: CheckCircleIcon, weight: "bold" },
  moderate: { icon: WarningIcon, weight: "bold" },
  high: { icon: WarningCircleIcon, weight: "bold" },
  critical: { icon: WarningOctagonIcon, weight: "fill" },
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
  const { icon: BandIcon, weight } = BAND_ICONS[band];

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap",
        BAND_CLASSES[band],
        className,
      )}
      data-slot="risk-badge"
      data-risk-band={band}
    >
      <BandIcon className="size-3.5 shrink-0" weight={weight} aria-hidden />
      {showScore && <span className="font-data">{clamped}</span>}
      <span>{t(band)}</span>
    </span>
  );
}
