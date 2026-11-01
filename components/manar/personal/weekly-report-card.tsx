"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Week totals. The features track fills this from its roll-up; only totals, never file names or
 * prompts. */
export interface WeeklyReport {
  /** ISO dates, inclusive. */
  from: string;
  to: string;
  actions: number;
  asked: number;
  blocked: number;
  secretsKeptSafe: number;
  /** Actions per day for the week, oldest first. The tallest bar is the busiest day. */
  daily?: number[];
}

export interface WeeklyReportCardProps {
  /** Undefined shows the empty state. */
  report?: WeeklyReport;
  isLoading?: boolean;
  /** Share action (the features track opens the share-card flow). Omit to hide the button. */
  onShare?: () => void;
  shareLabel?: ReactNode;
}

function Num({ value, tone, label }: { value: number; tone: string; label: string }) {
  const format = useFormatter();
  return (
    <div>
      <div className={`text-2xl leading-none font-semibold tabular-nums ${tone}`}>
        {format.number(value)}
      </div>
      <div className="mt-1.5 text-xs text-(--report-muted)">{label}</div>
    </div>
  );
}

/**
 * The weekly report card. It is the one card that stays Midnight in both themes (the shareable
 * object), so it reads the --report-* tokens, not the theme ones.
 */
export function WeeklyReportCard({
  report,
  isLoading,
  onShare,
  shareLabel,
}: WeeklyReportCardProps) {
  const t = useTranslations("personal.report");
  const format = useFormatter();
  const peak = Math.max(1, ...(report?.daily ?? [0]));

  return (
    <section className="grid gap-3.5 rounded-xl border border-(--report-line) bg-(--report-bg) p-4 text-(--report-text)">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="text-base font-medium">{t("title")}</h3>
        {report && (
          <span className="text-xs text-(--report-muted)">
            {format.dateTimeRange(new Date(report.from), new Date(report.to), {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" aria-busy />
      ) : !report ? (
        <p className="text-sm text-(--report-muted)">{t("empty")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Num value={report.actions} tone="text-(--report-blue)" label={t("actions")} />
            <Num value={report.asked} tone="text-(--report-orange)" label={t("asked")} />
            <Num value={report.blocked} tone="text-(--report-red)" label={t("blocked")} />
            <Num value={report.secretsKeptSafe} tone="text-(--report-blue)" label={t("secrets")} />
          </div>
          {report.daily && report.daily.length > 0 && (
            <div role="img" aria-label={t("chart")} className="flex h-[34px] items-end gap-1">
              {report.daily.map((n, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-sm bg-brand"
                  style={{ height: `${Math.max(4, Math.round((n / peak) * 100))}%` }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--report-muted)">
        <span>{t("privacy")}</span>
        {onShare && (
          <Button size="sm" variant="primary" onClick={onShare}>
            {shareLabel ?? t("share")}
          </Button>
        )}
      </div>
    </section>
  );
}
