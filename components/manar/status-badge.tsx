import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "neutral" | "warning" | "negative" | "info";

// Status tokens (DESIGN-SYSTEM.md section 2). `info` is neutral, same as `neutral`.
const TONE_CLASSES: Record<StatusTone, string> = {
  positive: "bg-allow-soft text-allow",
  neutral: "bg-subtle text-muted-foreground",
  warning: "bg-wait-soft text-wait",
  negative: "bg-deny-soft text-deny",
  info: "bg-subtle text-muted-foreground",
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
        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5 [&>svg]:shrink-0",
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
