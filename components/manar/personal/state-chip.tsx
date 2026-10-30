import { cn } from "@/lib/utils";

export type ChipKind = "allowed" | "waiting" | "blocked";

/**
 * Allowed / waiting / blocked chip. Status is never colour alone, so each kind has its own
 * shape: square (allowed, blue), dot (waiting, orange), bar (blocked, red).
 */
const KIND: Record<ChipKind, { tone: string; shape: string }> = {
  allowed: { tone: "bg-allow-soft text-allow", shape: "size-[7px] rounded-[2px]" },
  waiting: { tone: "bg-wait-soft text-wait", shape: "size-[7px] rounded-full" },
  blocked: { tone: "bg-deny-soft text-deny", shape: "h-[2px] w-2" },
};

export function StateChip({
  kind,
  count,
  label,
  className,
}: {
  kind: ChipKind;
  count: number;
  /** Full text for screen readers and the tooltip, e.g. "88 allowed". */
  label: string;
  className?: string;
}) {
  return (
    <span
      title={label}
      data-chip={kind}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
        KIND[kind].tone,
        className,
      )}
    >
      <span aria-hidden className={cn("bg-current", KIND[kind].shape)} />
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
