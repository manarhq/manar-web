"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/manar/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling, useBillingRedirect, type BillingStatus } from "@/hooks/use-billing";

type Metric = "devices" | "agents" | "cloudAgents";
const METRICS: Metric[] = ["devices", "agents", "cloudAgents"];

function UsageRow({ metric, data }: { metric: Metric; data: BillingStatus }) {
  const t = useTranslations("billing.usage");
  const used = data.usage[metric];
  const max = data.limits[metric];
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{t(metric)}</span>
        <span className="tabular-nums text-muted-foreground">
          {max === null ? `${used} · ${t("unlimited")}` : t("of", { used, max })}
        </span>
      </div>
      {max !== null && (
        <div
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={t(metric)}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** `/settings/billing`: plan, usage against limits, upgrade, portal. Same page in both shells. */
export function BillingView() {
  const t = useTranslations("billing");
  const format = useFormatter();
  const query = useBilling();
  const go = useBillingRedirect();
  const checkout = useSearchParams().get("checkout");

  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.isError)
    return (
      <div className="flex flex-col items-start gap-2 text-sm text-destructive">
        <span>{t("loadError")}</span>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          ↻
        </Button>
      </div>
    );

  const d = query.data;
  const isFree = d.plan === "free";
  const canBuy = d.billingEnabled && !d.hasSubscription && d.plan !== "enterprise";
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      {checkout === "success" && (
        <Alert>
          <AlertDescription>{t("success")}</AlertDescription>
        </Alert>
      )}
      {checkout === "cancelled" && (
        <Alert>
          <AlertDescription>{t("cancelled")}</AlertDescription>
        </Alert>
      )}
      {d.status === "read_only" && (
        <Alert role="alert">
          <AlertDescription>{t("readOnlyNotice")}</AlertDescription>
        </Alert>
      )}
      {d.status === "past_due" && (
        <Alert role="alert">
          <AlertDescription>{t("pastDueNotice")}</AlertDescription>
        </Alert>
      )}
      {go.isError && (
        <Alert role="alert">
          <AlertDescription>{t("actionError")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t(`plan.${d.plan}`)}
            <Badge variant="secondary">{t(`status.${d.status}`)}</Badge>
          </CardTitle>
          <CardDescription>
            {d.trialEndsAt
              ? t("trialEnds", {
                  date: format.dateTime(new Date(d.trialEndsAt), { dateStyle: "medium" }),
                })
              : t("current")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("usage.title")}</h2>
          {METRICS.map((m) => (
            <UsageRow key={m} metric={m} data={d} />
          ))}
          <div className="flex items-baseline justify-between text-sm">
            <span>{t("usage.auditDays")}</span>
            <span className="tabular-nums text-muted-foreground">
              {d.limits.auditDays === null
                ? t("usage.unlimited")
                : t("usage.days", { days: d.limits.auditDays })}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-medium">{t("features.title")}</h2>
          <ul className="flex flex-wrap gap-2">
            {(d.features.length ? d.features : ["none"]).map((f) => (
              <li key={f}>
                <Badge variant="outline">{t(`features.${f}` as never)}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("actions.title")}</CardTitle>
          {!d.billingEnabled && <CardDescription>{t("disabled")}</CardDescription>}
          {d.plan === "enterprise" && <CardDescription>{t("enterprise")}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canBuy && isFree && (
            <>
              <Button disabled={go.isPending} onClick={() => go.mutate("pro_monthly")}>
                {t("actions.proMonthly")} · {t("prices.proMonthly")}
              </Button>
              <Button
                variant="outline"
                disabled={go.isPending}
                onClick={() => go.mutate("pro_yearly")}
              >
                {t("actions.proYearly")} · {t("prices.proYearly")}
              </Button>
            </>
          )}
          {canBuy && (isFree || d.plan === "company_trial") && (
            <Button variant="outline" disabled={go.isPending} onClick={() => go.mutate("company")}>
              {t("actions.company")} · {t("prices.company")}
            </Button>
          )}
          {d.hasSubscription && (
            <>
              <Button disabled={go.isPending} onClick={() => go.mutate(undefined)}>
                {t("actions.manage")}
              </Button>
              <Button
                variant="outline"
                disabled={go.isPending}
                onClick={() => go.mutate(undefined)}
              >
                {t("actions.invoices")}
              </Button>
            </>
          )}
          {go.isPending && (
            <span className="text-sm text-muted-foreground">{t("actions.working")}</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
