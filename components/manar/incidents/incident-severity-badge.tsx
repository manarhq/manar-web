"use client";

import { useTranslations } from "next-intl";

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
const SEVERITY_CLASSES: Record<IncidentSeverity, string> = {
  LOW: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  MEDIUM: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
  HIGH: "bg-risk-high/15 text-risk-high ring-risk-high/30",
  CRITICAL: "bg-risk-critical/15 text-risk-critical ring-risk-critical/30",
};

export function IncidentSeverityBadge({
  severity,
  className,
}: {
  severity: IncidentSeverity;
  className?: string;
}) {
  const t = useTranslations("incidents.severity");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        SEVERITY_CLASSES[severity],
        className,
      )}
      data-slot="incident-severity-badge"
      data-severity={severity}
    >
      {t(severity)}
    </span>
  );
}
