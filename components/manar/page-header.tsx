import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Usually a plain string; accepts a node so a caller can wrap it
   * (e.g. a `title` attribute exposing a raw underlying value the
   * displayed text humanizes — see AuditDetailView). */
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Dense, consistent page-level header used by every route in the shell —
 * a title, optional one-line description, and a right-aligned action slot.
 * No hero imagery, no oversized spacing: this is an operator console. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border pb-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
