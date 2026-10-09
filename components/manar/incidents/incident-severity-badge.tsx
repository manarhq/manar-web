"use client";

import { useTranslations } from "next-intl";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  WarningCircleIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import type { IncidentSeverity } from "@/hooks/use-incidents";

/**
 * Incident severity reuses the exact same four-color language as
 * `RiskBadge`'s bands (lib/risk.ts, Section 58) rather than inventing a
 * page-local palette — LOW/MEDIUM/HIGH/CRITICAL map onto low/moderate/
 * high/critical, the same colors those words mean everywhere else in
 * this product. Unlike `RiskBadge`, an incident has no numeric 0-100
 * score to render alongside the label — severity is a plain enum here.
 */
// Same mapping as the risk bands: low allow, medium wait, high and critical deny, with
// critical set apart by a solid fill and a filled octagon.
const SEVERITY: Record<
  IncidentSeverity,
  { className: string; icon: PhosphorIcon; weight: "bold" | "fill" }
> = {
  LOW: { className: "bg-allow-soft text-allow", icon: CheckCircleIcon, weight: "bold" },
  MEDIUM: { className: "bg-wait-soft text-wait", icon: WarningIcon, weight: "bold" },
  HIGH: { className: "bg-deny-soft text-deny", icon: WarningCircleIcon, weight: "bold" },
  CRITICAL: { className: "bg-deny text-brand-text", icon: WarningOctagonIcon, weight: "fill" },
};

export function IncidentSeverityBadge({
  severity,
  className,
}: {
  severity: IncidentSeverity;
  className?: string;
}) {
  const t = useTranslations("incidents.severity");
  const { className: tone, icon: SeverityIcon, weight } = SEVERITY[severity];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
      data-slot="incident-severity-badge"
      data-severity={severity}
    >
      <SeverityIcon className="size-3.5 shrink-0" weight={weight} aria-hidden />
      {t(severity)}
    </span>
  );
}
