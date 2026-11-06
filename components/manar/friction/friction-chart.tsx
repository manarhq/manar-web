import type { FrictionReport } from "@/hooks/use-friction";

/**
 * Prompts per day as bars, oldest first (left to right; mirrored in right-to-left languages, so
 * time always runs the way the reader reads), with the budget as a dashed line. The chart is a picture of the table
 * below it: it has a text alternative that states the totals, and the same numbers are always
 * available as a table (FrictionView), so nothing depends on seeing the bars or their colour.
 */
export function FrictionChart({
  series,
  budget,
  label,
  budgetLabel,
}: {
  series: FrictionReport["series"];
  budget: number;
  label: string;
  budgetLabel: string;
}) {
  const W = 100 * series.length;
  const H = 120;
  const top = Math.max(budget, ...series.map((s) => s.prompts), 1);
  const y = (v: number) => H - (v / top) * (H - 8);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-32 w-full text-brand rtl:-scale-x-100"
    >
      {series.map((s, i) => (
        <rect
          key={s.day}
          x={i * 100 + 20}
          width={60}
          y={y(s.prompts)}
          height={H - y(s.prompts)}
          className="fill-current"
          rx={3}
        />
      ))}
      <line
        x1={0}
        x2={W}
        y1={y(budget)}
        y2={y(budget)}
        strokeDasharray="6 4"
        className="stroke-muted-foreground"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      >
        <title>{budgetLabel}</title>
      </line>
    </svg>
  );
}
