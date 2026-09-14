import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
  /** Rendered top-right, e.g. a trend or an icon. */
  accessory?: ReactNode;
  "data-testid"?: string;
}

/** A single live metric tile — the shape /overview's proof-of-life number
 * renders in. Dense by design: a small sentence-case label, a large
 * tabular number, an optional one-line hint. No card chrome beyond a
 * hairline border — this is read at a glance across a wall of tiles, not
 * admired. Sentence case, not ALL-CAPS: that treatment is reserved for
 * the sidebar's three category dividers only (design-rework.md). */
export function StatTile({ label, value, hint, className, accessory, ...rest }: StatTileProps) {
  return (
    <div
      className={cn(
        // Padding and internal gap follow html[data-density] through the
        // --density-* tokens (see app/globals.css); a wall of tiles
        // tightens up with the tables around it rather than staying
        // stubbornly roomy in compact.
        "flex flex-col gap-(--density-tile-gap) rounded-lg border border-border bg-card px-(--density-tile-padding-inline) py-(--density-tile-padding-block)",
        className,
      )}
      data-testid={rest["data-testid"]}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {accessory}
      </div>
      <span className="font-data text-2xl font-semibold text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
