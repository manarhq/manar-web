import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "neutral" | "warning" | "negative" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: "bg-risk-minimal/15 text-risk-minimal ring-risk-minimal/30",
  neutral: "bg-muted text-muted-foreground ring-border",
  warning: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
  negative: "bg-risk-critical/15 text-risk-critical ring-risk-critical/30",
  info: "bg-risk-low/15 text-risk-low ring-risk-low/30",
};

export interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

/**
 * A generic status pill reusing RiskBadge's exact color language (Section
 * 58) rather than each resource (agents/tasks/tools/policies/approvals)
 * inventing its own status-color mapping — "active"/"approved"/"enabled"
 * always reads as the same green, "revoked"/"denied"/"killed" always the
 * same red, everything in between the same amber, regardless of which
 * resource's status enum it's labeling.
 */
export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
      data-slot="status-badge"
      data-status-tone={tone}
    >
      {children}
    </span>
  );
}
