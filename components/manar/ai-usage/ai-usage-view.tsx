"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDailyAiUsage } from "@/hooks/use-billing";
import { AiUsageChart } from "./ai-usage-chart";

const PERIODS = [7, 30, 90] as const;

/**
 * The workspace's own AI usage (performance program, decision 10): a daily chart of the AI actions
 * it used, split into the plan's included allowance and credits, with the same numbers as a table.
 * The figures come from the events the usage meter itself counts, so they agree with Billing.
 */
export function AiUsageView() {
  const t = useTranslations("aiUsage");
  const format = useFormatter();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [asTable, setAsTable] = useState(false);
  const usage = useDailyAiUsage(days);
  const date = (d: string) =>
    format.dateTime(new Date(`${d}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div role="group" aria-label={t("periodLabel")} className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === days ? "default" : "outline"}
            aria-pressed={p === days}
            onClick={() => setDays(p)}
          >
            {t(`period.${p}`)}
          </Button>
        ))}
      </div>

      {usage.isPending && <Skeleton className="h-64 w-full" />}

      {usage.isError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm"
        >
          <span className="text-foreground">{t("loadError")}</span>
          <Button size="sm" variant="outline" onClick={() => void usage.refetch()}>
            {t("retry")}
          </Button>
        </div>
      )}

      {usage.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("cards.total")} value={format.number(usage.data.totals.actions)} />
            <Stat
              label={t("cards.allowance")}
              value={format.number(usage.data.totals.fromAllowance)}
            />
            <Stat label={t("cards.credits")} value={format.number(usage.data.totals.fromCredits)} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">{t("chart.title")}</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={asTable}
                onClick={() => setAsTable((v) => !v)}
              >
                {asTable ? t("chart.showChart") : t("chart.showTable")}
              </Button>
            </CardHeader>
            <CardContent>
              {usage.data.totals.actions === 0 && (
                <p className="mb-3 text-sm text-muted-foreground">{t("empty")}</p>
              )}
              {asTable ? (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t("table.caption")}</caption>
                    <thead>
                      <tr className="border-b border-border text-start text-xs text-muted-foreground">
                        <th scope="col" className="py-1.5 pe-3 text-start font-medium">
                          {t("table.date")}
                        </th>
                        <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                          {t("table.total")}
                        </th>
                        <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                          {t("table.allowance")}
                        </th>
                        <th scope="col" className="py-1.5 text-end font-medium">
                          {t("table.credits")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...usage.data.days].reverse().map((d) => (
                        <tr key={d.date} className="border-b border-border/50">
                          <th scope="row" className="py-1.5 pe-3 text-start font-normal">
                            {date(d.date)}
                          </th>
                          <td className="py-1.5 pe-3 text-end tabular-nums">
                            {format.number(d.actions)}
                          </td>
                          <td className="py-1.5 pe-3 text-end tabular-nums">
                            {format.number(d.fromAllowance)}
                          </td>
                          <td className="py-1.5 text-end tabular-nums">
                            {format.number(d.fromCredits)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <AiUsageChart days={usage.data.days} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("cards.month")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                {t("cards.monthValue", {
                  used: usage.data.month.used,
                  included: usage.data.month.included,
                })}
              </p>
              <p className="text-muted-foreground">
                {t("cards.creditsMonth", { credits: usage.data.month.creditsSpent })} ·{" "}
                {t("cards.balance", { credits: usage.data.month.creditBalance })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("creditsNote")}{" "}
                <Link href="/settings/billing" className="underline underline-offset-2">
                  {t("billingLink")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
