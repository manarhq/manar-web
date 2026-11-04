"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { track } from "@/lib/telemetry/track";
import {
  useBilling,
  useBillingRedirect,
  useBuyCredits,
  useCancelTrial,
  useUsage,
  useWalletSettings,
  type BillingStatus,
  type CheckoutPlan,
  type UsageStatus,
} from "@/hooks/use-billing";

/** The dirham is pegged: 1 USD = 3.6725 AED. Prices are charged in USD; AED is shown beside them. */
export const AED_PER_USD = 3.6725;
/** $5 buys 1,000 credits. */
const CENTS_PER_CREDIT = 0.5;

type Metric = "devices" | "agents" | "cloudAgents";
const METRICS: Metric[] = ["devices", "agents", "cloudAgents"];

/** "$5.00 (AED 18.36)". */
export function useMoney() {
  const format = useFormatter();
  return (cents: number) => {
    const usd = format.number(cents / 100, { style: "currency", currency: "USD" });
    const aed = format.number((cents / 100) * AED_PER_USD, {
      style: "currency",
      currency: "AED",
    });
    return `${usd} (${aed})`;
  };
}

function Meter({ label, used, max }: { label: string; used: number; max: number | null }) {
  const t = useTranslations("billing.usage");
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {max === null ? `${used} · ${t("unlimited")}` : t("of", { used, max })}
        </span>
      </div>
      {max !== null && max > 0 && (
        <div
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={pct >= 100 ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The console banner for spend safety: the highest alert this month (100% of the allowance or the
 * cap, low credits, 80%). It always says protection keeps working. Renders nothing without data
 * (a member without the billing role gets a 403 and sees nothing).
 */
export function UsageBanner({ usage }: { usage?: UsageStatus }) {
  const t = useTranslations("billing.banner");
  if (!usage) return null;
  const a = usage.alerts;
  const key = a.includes("cap:100")
    ? "cap"
    : a.includes("ai:100") || a.includes("minutes:100")
      ? usage.wallet.available
        ? usage.wallet.balance > 0
          ? "credits"
          : "noCredits"
        : "free"
      : a.includes("credits:low")
        ? "low"
        : a.includes("ai:80") || a.includes("minutes:80") || a.includes("cap:80")
          ? "near"
          : null;
  if (!key) return null;
  const paused = key === "cap" || key === "noCredits" || key === "free";
  return (
    <Alert role={paused ? "alert" : "status"}>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {t(key)} <strong>{t("safe")}</strong>
        </span>
        <Link href="/settings/billing" className="underline">
          {t("open")}
        </Link>
      </AlertDescription>
    </Alert>
  );
}

function UsageCard({ usage }: { usage: UsageStatus }) {
  const t = useTranslations("billing.usageCard");
  const money = useMoney();
  const kind = usage.active.kind === "seat" ? "seats" : "devices";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Meter label={t("ai")} used={usage.allowance.ai.used} max={usage.allowance.ai.included} />
        {usage.allowance.cloudMinutes.included > 0 && (
          <Meter
            label={t("minutes")}
            used={usage.allowance.cloudMinutes.used}
            max={usage.allowance.cloudMinutes.included}
          />
        )}
        <div className="flex items-baseline justify-between text-sm">
          <span>{t(`active.${kind}`)}</span>
          <span className="tabular-nums text-muted-foreground">
            {t("activeCount", { count: usage.active.count, coming: usage.active.onTheirWay })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t("activeHelp")}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt>{t("soFar")}</dt>
          <dd className="text-end tabular-nums">{money(usage.bill.soFarCents)}</dd>
          <dt>{t("forecast")}</dt>
          <dd className="text-end tabular-nums">{money(usage.bill.forecastCents)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">{t("vat")}</p>
      </CardContent>
    </Card>
  );
}

function WalletCard({ usage, canEdit }: { usage: UsageStatus; canEdit: boolean }) {
  const t = useTranslations("billing.wallet");
  const format = useFormatter();
  const money = useMoney();
  const buy = useBuyCredits();
  const save = useWalletSettings();
  const w = usage.wallet;
  const [packs, setPacks] = useState(1);
  const capUsd = w.capCredits === null ? "" : String((w.capCredits * CENTS_PER_CREDIT) / 100);
  // The parent keys this card by the saved cap, so a saved change starts the field afresh.
  const [cap, setCap] = useState(capUsd);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-2xl font-semibold tabular-nums">
          {t("balance", { credits: w.balance })}
        </p>
        {w.expiringSoon.map((l) => (
          <p key={l.expiresAt} className="text-xs text-muted-foreground">
            {t("expiring", {
              credits: l.credits,
              date: format.dateTime(new Date(l.expiresAt), { dateStyle: "medium" }),
            })}
          </p>
        ))}
        <p className="text-sm text-muted-foreground">
          {w.capCredits === null
            ? t("spentNoCap", { spent: w.creditsSpent })
            : t("spent", { spent: w.creditsSpent, cap: w.capCredits })}
        </p>

        {canEdit && (
          <>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                buy.mutate(packs);
              }}
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="packs">{t("packs")}</Label>
                <Input
                  id="packs"
                  type="number"
                  min={1}
                  max={20}
                  value={packs}
                  onChange={(e) => setPacks(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24"
                />
              </div>
              <Button type="submit" disabled={buy.isPending}>
                {t("buy", { credits: packs * 1000, price: money(packs * 500) })}
              </Button>
            </form>

            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ capUsd: cap === "" ? null : Math.max(0, Math.round(Number(cap))) });
              }}
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="cap">{t("cap")}</Label>
                <Input
                  id="cap"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={cap}
                  placeholder={t("noCap")}
                  onChange={(e) => setCap(e.target.value)}
                  className="w-32"
                />
              </div>
              <Button type="submit" variant="outline" disabled={save.isPending}>
                {t("saveCap")}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">{t("capHelp")}</p>

            <div className="flex items-start gap-3">
              <Switch
                id="autoTopUp"
                checked={w.autoTopUp}
                disabled={save.isPending}
                onCheckedChange={(checked) => save.mutate({ autoTopUp: checked })}
              />
              <div className="flex flex-col">
                <Label htmlFor="autoTopUp">{t("autoTopUp")}</Label>
                <span className="text-xs text-muted-foreground">{t("autoTopUpHelp")}</span>
              </div>
            </div>
          </>
        )}
        {(buy.isError || save.isError) && (
          <Alert role="alert">
            <AlertDescription>{t("error")}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-muted-foreground">{t("rules")}</p>
      </CardContent>
    </Card>
  );
}

function PlanChoices({ d, go }: { d: BillingStatus; go: ReturnType<typeof useBillingRedirect> }) {
  const t = useTranslations("billing.actions");
  const [seats, setSeats] = useState(3);
  const buy = (plan: CheckoutPlan, n?: number) => go.mutate(n ? { plan, seats: n } : { plan });
  const company = d.workspaceKind === "COMPANY";
  const free = d.plan === "free" || d.plan === "trial";
  if (!company)
    return free ? (
      <>
        <Button disabled={go.isPending} onClick={() => buy("pro_monthly")}>
          {t("proMonthly")}
        </Button>
        <Button variant="outline" disabled={go.isPending} onClick={() => buy("pro_yearly")}>
          {t("proYearly")}
        </Button>
      </>
    ) : null;
  if (!(free || d.plan === "company_trial")) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {d.plan !== "company_trial" && !d.trialUsed && (
          <Button disabled={go.isPending} onClick={() => buy("company_trial")}>
            {t("companyTrial")}
          </Button>
        )}
        <Button variant="outline" disabled={go.isPending} onClick={() => buy("company_monthly")}>
          {t("companyMonthly")}
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          buy("company_yearly", seats);
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="seats">{t("seats")}</Label>
          <Input
            id="seats"
            type="number"
            min={3}
            value={seats}
            onChange={(e) => setSeats(Math.max(3, Number(e.target.value) || 3))}
            className="w-24"
          />
        </div>
        <Button type="submit" variant="outline" disabled={go.isPending}>
          {t("companyYearly", { seats })}
        </Button>
      </form>
      {d.plan !== "company_trial" && !d.trialUsed && (
        <p className="text-xs text-muted-foreground">{t("trialHelp")}</p>
      )}
    </div>
  );
}

/** `/settings/billing`: plan, usage and bill so far, credits, upgrade, portal. Same page in both shells. */
export function BillingView({ canEdit = true }: { canEdit?: boolean }) {
  const t = useTranslations("billing");
  const format = useFormatter();
  const query = useBilling();
  const usage = useUsage();
  const go = useBillingRedirect();
  const cancelTrial = useCancelTrial();
  const params = useSearchParams();
  const checkout = params.get("checkout");
  const credits = params.get("credits");
  const askCancel = params.get("trial") === "cancel";
  useEffect(() => {
    if (checkout === "success") track("plan_changed", { via: "checkout" });
  }, [checkout]);

  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.isError)
    return (
      <div className="flex flex-col items-start gap-2 text-sm text-destructive">
        <span>{t("loadError")}</span>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );

  const d = query.data;
  const canBuy = canEdit && d.billingEnabled && !d.hasSubscription && d.plan !== "enterprise";
  const errorCode = (go.error as { code?: string } | null)?.code;
  return (
    <div className="flex flex-col gap-4">
      {/* The spend-safety banner is shown above every page by the shell (GrowthBanners). */}
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
      {credits === "success" && (
        <Alert>
          <AlertDescription>{t("creditsSuccess")}</AlertDescription>
        </Alert>
      )}
      {d.plan === "company_trial" && canEdit && (
        <Alert role={askCancel ? "alert" : "status"}>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("trialCancel.body", {
                date: d.trialEndsAt
                  ? format.dateTime(new Date(d.trialEndsAt), { dateStyle: "long" })
                  : "",
              })}
            </span>
            <Button
              size="sm"
              variant={askCancel ? "destructive" : "outline"}
              disabled={cancelTrial.isPending || cancelTrial.isSuccess}
              onClick={() => cancelTrial.mutate()}
            >
              {t("trialCancel.button")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {cancelTrial.isSuccess && (
        <Alert>
          <AlertDescription>{t("trialCancel.done")}</AlertDescription>
        </Alert>
      )}
      {cancelTrial.isError && (
        <Alert role="alert">
          <AlertDescription>{t("actionError")}</AlertDescription>
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
      {d.status === "frozen" && (
        <Alert role="alert">
          <AlertDescription>{t("frozenNotice")}</AlertDescription>
        </Alert>
      )}
      {go.isError && (
        <Alert role="alert">
          <AlertDescription>
            {errorCode === "contact_email_required" ? (
              <>
                {t("contactRequired")}{" "}
                <Link href="/settings/profile" className="underline">
                  {t("contactRequiredLink")}
                </Link>
              </>
            ) : errorCode === "work_email_required" || errorCode === "trial_used" ? (
              t(`errors.${errorCode}`)
            ) : (
              t("actionError")
            )}
          </AlertDescription>
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
              : t(`planLine.${d.plan}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("usage.title")}</h2>
          {METRICS.map((m) => (
            <Meter key={m} label={t(`usage.${m}`)} used={d.usage[m]} max={d.limits[m]} />
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
          <p className="text-xs text-muted-foreground">{t("safetyNote")}</p>
        </CardContent>
      </Card>

      {usage.data && <UsageCard usage={usage.data} />}
      {usage.data?.wallet.available && (
        <WalletCard
          key={String(usage.data.wallet.capCredits)}
          usage={usage.data}
          canEdit={canEdit}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("actions.title")}</CardTitle>
          {!d.billingEnabled && <CardDescription>{t("disabled")}</CardDescription>}
          {d.plan === "enterprise" && <CardDescription>{t("enterprise")}</CardDescription>}
          {canBuy && (
            <CardDescription>
              {t(d.workspaceKind === "COMPANY" ? "prices.company" : "prices.pro")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canBuy && <PlanChoices d={d} go={go} />}
          {d.hasSubscription && canEdit && (
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
