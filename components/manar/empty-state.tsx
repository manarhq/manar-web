import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  /** One-sentence explanation of why this list/panel is empty. */
  description: string;
  /** Optional heading; falls back to nothing (description alone reads
   * fine at this scale — most call sites already have a PageHeader
   * title above this). */
  title?: string;
  /** Optional next-action affordance, e.g. a "Create task" button —
   * rendered as-is, not wrapped, so callers can pass any real button/
   * link component (CreateTaskDialog's trigger, a Link, ...). */
  action?: ReactNode;
  className?: string;
}

/**
 * Manar's one shared "there's nothing here yet" treatment
 * (design-rework.md's Layout section): an icon, a one-sentence
 * explanation, and an optional next action — never a lone gray sentence
 * floating in an otherwise-empty viewport. Every list/panel with a real
 * "no X yet" case should render this instead of hand-rolling its own
 * empty copy (this phase wires it into one real page — Tasks — as proof;
 * applying it everywhere else is the next phase's job, per
 * docs/design-rework.md's sequencing).
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center",
        className,
      )}
      data-slot="empty-state"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-card-raised">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        {title && <p className="text-sm font-medium text-foreground">{title}</p>}
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
