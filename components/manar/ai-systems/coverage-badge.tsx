"use client";

import { useTranslations } from "next-intl";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { FileTextIcon, PulseIcon, ShieldCheckIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import type { AiSystemCoverageValue } from "@/hooks/use-ai-systems";
import { COVERAGE_HATCH_STYLE, coveragePresentation } from "@/components/manar/ai-systems/coverage";

/**
 * The coverage verdict as a pill. Deliberately NOT built on
 * `components/manar/status-badge.tsx`: that component's tone vocabulary
 * (`positive`/`warning`/`negative`/...) is an ordered "how good is this"
 * scale backed by the risk ramp, and coverage is not that scale. Reusing
 * it would have encoded exactly the ranking this vocabulary exists to
 * refuse.
 *
 * Every value carries an icon and a label as well as a colour, so the
 * four stay distinguishable in greyscale and for a colour-blind reader —
 * and `MONITORING_UNAVAILABLE` additionally gets a diagonal hatch and a
 * warning glyph so it can never be mistaken for the calm
 * `DECLARED_ONLY`. See `./coverage.ts` for the full reasoning.
 */
const ICONS: Record<AiSystemCoverageValue, PhosphorIcon> = {
  GOVERNED: ShieldCheckIcon,
  OBSERVED_ONLY: PulseIcon,
  DECLARED_ONLY: FileTextIcon,
  MONITORING_UNAVAILABLE: WarningIcon,
};

export interface CoverageBadgeProps {
  coverage: AiSystemCoverageValue;
  className?: string;
}

export function CoverageBadge({ coverage, className }: CoverageBadgeProps) {
  const t = useTranslations("aiSystems.coverage");
  const presentation = coveragePresentation(coverage);
  const Icon = ICONS[coverage];

  return (
    <span
      data-slot="coverage-badge"
      data-coverage={coverage}
      data-coverage-surface={presentation.surface}
      data-coverage-border={presentation.border}
      data-coverage-hatched={presentation.hatched ? "true" : "false"}
      style={presentation.hatched ? COVERAGE_HATCH_STYLE : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        presentation.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(`${coverage}.label`)}
    </span>
  );
}
