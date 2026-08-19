import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "neutral" | "warning" | "negative" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: "bg-state-safe/15 text-state-safe ring-state-safe/30",
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
 * A generic status pill with a consistent tone->color mapping reused by
 * every resource (agents/tasks/tools/policies/approvals) rather than each
 * one inventing its own — "active"/"approved"/"enabled" always reads as
 * `--state-safe` (the one green reserved for verified/active/success,
 * design-rework.md), "revoked"/"denied"/"killed" always the risk-critical
 * red, everything in between the risk-moderate amber. `positive`
 * deliberately does NOT reuse `--risk-minimal` (Section 58's risk ramp) —
 * risk-band color and "this resource is in a good state" are different
 * concepts that used to collide on the same green.
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
