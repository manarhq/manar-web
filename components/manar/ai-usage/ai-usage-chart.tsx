"use client";

import { useId } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { DailyAiUsage } from "@/hooks/use-billing";

type Day = DailyAiUsage["days"][number];

const W = 600;
const H = 180;
const PAD = { top: 8, bottom: 22, start: 34, end: 4 };

/** A round top for the y axis: 7 -> 10, 13 -> 20, 130 -> 200. */
export function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((c) => c >= n) ?? 10 * pow;
  return step;
}

/**
 * Daily AI actions as stacked bars: the included allowance and credits, told apart by fill and by
 * a hatch pattern (never by colour alone). It is one image for assistive technology, with the whole
 * story in its label; the same numbers are in the table the page offers instead (`AiUsageView`).
 * Direction-safe: the chart is left to right in both locales, like every numeric axis.
 */
export function AiUsageChart({ days }: { days: Day[] }) {
  const t = useTranslations("aiUsage.chart");
  const format = useFormatter();
  const id = useId();
  const fullDate = (d: string) =>
    format.dateTime(new Date(`${d}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
  const shortDate = (d: string) =>
    format.dateTime(new Date(`${d}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const max = Math.max(0, ...days.map((d) => d.actions));
  const top = niceMax(max);
  const busiest = days.reduce<Day | undefined>(
    (a, d) => (!a || d.actions > a.actions ? d : a),
    undefined,
  );
  const total = days.reduce((a, d) => a + d.actions, 0);
  const plotW = W - PAD.start - PAD.end;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(days.length, 1);
  const barW = Math.max(1, slot * 0.7);
  const y = (n: number) => PAD.top + plotH - (n / top) * plotH;
  const labelAt = new Set([0, Math.floor((days.length - 1) / 2), days.length - 1]);

  return (
    <figure className="m-0" dir="ltr">
      <p id={`${id}-desc`} className="sr-only">
        {busiest
          ? t("summary", {
              total,
              days: days.length,
              date: fullDate(busiest.date),
              max: busiest.actions,
            })
          : t("title")}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full text-foreground"
        role="img"
        aria-label={t("title")}
        aria-describedby={`${id}-desc`}
      >
        <defs>
          <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--card)" />
            <path d="M0 6 L6 0" stroke="var(--foreground)" strokeWidth="1.6" />
          </pattern>
        </defs>
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.start}
              x2={W - PAD.end}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={PAD.start - 4}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-current text-[10px]"
              fillOpacity={0.75}
            >
              {format.number(tick)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.start + i * slot + (slot - barW) / 2;
          const hA = (d.fromAllowance / top) * plotH;
          const hC = (d.fromCredits / top) * plotH;
          return (
            <g key={d.date}>
              <title>
                {t("bar", {
                  date: fullDate(d.date),
                  total: d.actions,
                  allowance: d.fromAllowance,
                  credits: d.fromCredits,
                })}
              </title>
              {hA > 0 && (
                <rect
                  x={x}
                  y={PAD.top + plotH - hA}
                  width={barW}
                  height={hA}
                  fill="var(--primary)"
                />
              )}
              {hC > 0 && (
                <rect
                  x={x}
                  y={PAD.top + plotH - hA - hC}
                  width={barW}
                  height={hC}
                  fill={`url(#${id}-hatch)`}
                  stroke="var(--foreground)"
                  strokeWidth="0.8"
                />
              )}
            </g>
          );
        })}
        {days.map((d, i) =>
          labelAt.has(i) ? (
            <text
              key={d.date}
              x={PAD.start + i * slot + slot / 2}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
              className="fill-current text-[10px]"
              fillOpacity={0.75}
            >
              {shortDate(d.date)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden>
            <rect width="12" height="12" fill="var(--primary)" />
          </svg>
          {t("legendAllowance")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden>
            <defs>
              <pattern id={`${id}-key`} width="5" height="5" patternUnits="userSpaceOnUse">
                <rect width="5" height="5" fill="var(--card)" />
                <path d="M0 5 L5 0" stroke="var(--foreground)" strokeWidth="1.4" />
              </pattern>
            </defs>
            <rect width="12" height="12" fill={`url(#${id}-key)`} stroke="var(--foreground)" />
          </svg>
          {t("legendCredits")}
        </span>
        <span className="ms-auto tabular-nums">{t("maxLabel", { max })}</span>
      </figcaption>
    </figure>
  );
}
