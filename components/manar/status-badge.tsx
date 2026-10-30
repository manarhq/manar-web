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
 * A generic status pill with one tone->colour mapping reused by every resource
 * (agents/tasks/tools/policies/approvals). Midnight palette roles: `positive` is blue
 * (Manar has it: active, approved, enabled, governed), `warning` is orange (waiting on a
 * person), `negative` is stop red (revoked, denied, killed). Status is never colour alone:
 * callers pair the pill with an icon and a word.
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
