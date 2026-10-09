"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  BroadcastIcon,
  CellTowerIcon,
  ClipboardTextIcon,
  GaugeIcon,
  PulseIcon,
  RobotIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/manar/page-header";
import { RiskMeter } from "@/components/manar/risk-meter";
import { RiskBadge } from "@/components/manar/risk-badge";
import { EmptyState } from "@/components/manar/empty-state";
import { ApiErrorState } from "@/components/manar/api-error-state";
import { StatTile } from "@/components/manar/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalsList } from "@/hooks/use-approvals";
import { useAgentsList, type AgentStatus } from "@/hooks/use-agents";
import { useAuditSearch } from "@/hooks/use-audit";
import { useAuditVerify } from "@/hooks/use-audit-verify";
import { useLiveEventCount } from "@/hooks/use-live-event-count";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import { EventTypeLabel } from "@/components/manar/event-type-label";
import { RISK_BANDS, riskBandForScore, type RiskBand } from "@/lib/risk";

const AGENT_STATUSES: AgentStatus[] = ["ACTIVE", "REVOKED", "KILLED", "PENDING_ENROLLMENT"];

/** Tailwind class per band for the risk-concentration bars — a static map,
 * not a template-interpolated class name, so Tailwind's JIT content scan
 * actually picks these up (same pattern as risk-badge.tsx/risk-meter.tsx's
 * BAND_CLASSES/BAND_STROKE/BAND_TEXT maps). */
const BAND_BAR_CLASS: Record<RiskBand, string> = {
  minimal: "bg-risk-minimal",
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

/**
 * /overview's real dashboard (design-rework.md's Layout section): the
 * RiskMeter signature element as the dashboard's centerpiece (paired with
 * a client-side risk-concentration histogram, see below), an
 * agents/system status strip, a pending-approvals callout, and a recent-
 * activity list — every number here is real data from existing hooks
 * (useApprovalsList, useAgentsList, useAuditSearch, useAuditVerify,
 * useLiveEventCount), no new backend endpoint.
 *
 * The risk aggregate specifically: this product's SOC operators care
 * about "what's the riskiest thing waiting on a human right now" more
 * than a passive average, so the meter defaults to the highest riskScore
 * among currently PENDING approvals (with a direct link to that
 * approval) whenever one exists. Only when the approvals queue is empty
 * does it fall back to the average riskScore across the most recent
 * audit events that actually carry a `decision` (i.e. real authorization
 * decisions, not every event type) — still a meaningful "how risky has
 * recent activity been" signal, just a passive one instead of an
 * actionable one. If neither pending approvals nor recent decisions with
 * a risk score exist, the meter is replaced with an EmptyState rather
 * than showing a fabricated 0.
 *
 * "Where risk is concentrated" (SOC console redesign Task 3): bucketed
 * client-side, from the exact same two data sources already fetched for
 * the meter above — every currently PENDING approval's riskScore, plus
 * every recent audit event that carries both a real `decision` and a
 * riskScore (the same `recentDecisions` set the meter's average falls
 * back to) — grouped into lib/risk.ts's five real bands. No new backend
 * call, no fabricated values: this is a real distribution of what's
 * already on screen, and it is empty in exactly the same case the meter
 * itself is (see `meterMode === "none"`), since it draws from the same
 * two sets. Deliberately does NOT include the full agent roster: agents
 * (AgentSummaryDto) carry no riskScore field in the API schema, so a
 * per-agent risk bucket would have to be fabricated — out of scope per
 * this task's "no fabricated data" constraint (see task-3-report.md).
 */
export function OverviewDashboard() {
  const t = useTranslations("overview");
  const tRisk = useTranslations("risk");
  const tApiError = useTranslations("common.apiError");
  const format = useFormatter();
  const resolveActorName = useActorNameResolver();

  const auditVerify = useAuditVerify();
  const live = useLiveEventCount();

  const pendingApprovals = useApprovalsList({ status: "PENDING" });
  const pendingItems = useMemo(
    () => pendingApprovals.data?.pages.flatMap((page) => page.items) ?? [],
    [pendingApprovals.data],
  );

  const agents = useAgentsList();
  const agentItems = useMemo(
    () => agents.data?.pages.flatMap((page) => page.items) ?? [],
    [agents.data],
  );
  const agentCounts = useMemo(() => {
    const counts: Record<AgentStatus, number> = {
      ACTIVE: 0,
      REVOKED: 0,
      KILLED: 0,
      PENDING_ENROLLMENT: 0,
    };
    for (const agent of agentItems) counts[agent.status] += 1;
    return counts;
  }, [agentItems]);

  const recentAudit = useAuditSearch({});
  const recentPage = useMemo(() => recentAudit.data?.pages[0]?.items ?? [], [recentAudit.data]);
  const recentItems = useMemo(() => recentPage.slice(0, 8), [recentPage]);

  const riskiestPending = useMemo(
    () =>
      pendingItems.length === 0
        ? null
        : pendingItems.reduce((max, item) => (item.riskScore > max.riskScore ? item : max)),
    [pendingItems],
  );

  const recentDecisions = useMemo(
    () => recentPage.filter((event) => event.decision && typeof event.riskScore === "number"),
    [recentPage],
  );
  const averageRecentRisk = useMemo(() => {
    if (recentDecisions.length === 0) return null;
    const sum = recentDecisions.reduce((total, event) => total + (event.riskScore ?? 0), 0);
    return Math.round(sum / recentDecisions.length);
  }, [recentDecisions]);

  const meterLoading = pendingApprovals.isPending || recentAudit.isPending;
  // A failed source must never read as "no risk" (GATE-0 S50).
  const meterError = pendingApprovals.error ?? recentAudit.error;
  const meterMode: "pending" | "average" | "none" = riskiestPending
    ? "pending"
    : averageRecentRisk !== null
      ? "average"
      : "none";
  const meterScore = riskiestPending?.riskScore ?? averageRecentRisk ?? 0;

  const riskConcentrationCounts = useMemo(() => {
    const counts: Record<RiskBand, number> = {
      minimal: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
    };
    for (const item of pendingItems) counts[riskBandForScore(item.riskScore)] += 1;
    for (const event of recentDecisions) counts[riskBandForScore(event.riskScore ?? 0)] += 1;
    return counts;
  }, [pendingItems, recentDecisions]);
  const riskConcentrationTotal = pendingItems.length + recentDecisions.length;
  const riskConcentrationMax = Math.max(1, ...Object.values(riskConcentrationCounts));
  const riskConcentrationRows = useMemo(
    () =>
      [...RISK_BANDS].reverse().map(({ band }) => ({ band, count: riskConcentrationCounts[band] })),
    [riskConcentrationCounts],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      {pendingApprovals.isError && (
        <ApiErrorState error={pendingApprovals.error} onRetry={() => pendingApprovals.refetch()} />
      )}

      {pendingItems.length > 0 && (
        <Link
          href="/approvals"
          className="flex items-center justify-between gap-3 rounded-xl border border-risk-moderate/40 bg-risk-moderate/10 px-4 py-3 text-sm transition-colors hover:bg-risk-moderate/15"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ClipboardTextIcon className="size-4 text-risk-moderate" aria-hidden />
            {t("dashboard.pendingApprovalsCallout", { count: pendingItems.length })}
          </span>
          <span className="text-xs text-primary">{t("dashboard.reviewApprovals")}</span>
        </Link>
      )}

      <section
        aria-labelledby="overview-risk-heading"
        className="rounded-xl border border-border bg-card p-6 ring-1 ring-primary/10"
      >
        <h2
          id="overview-risk-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {t("dashboard.riskTitle")}
        </h2>

        {meterError ? (
          <ApiErrorState error={meterError} className="mt-4" />
        ) : meterLoading ? (
          <div className="mt-4 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            <Skeleton className="h-32 w-40" />
            <div className="flex w-full flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ) : meterMode === "none" ? (
          <EmptyState
            icon={GaugeIcon}
            description={t("dashboard.riskEmpty")}
            className="mt-4 border-none py-10"
          />
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex flex-col items-center gap-2 lg:border-e lg:border-border lg:pe-8">
              <RiskMeter score={meterScore} />
              <p className="max-w-56 text-center text-xs text-muted-foreground">
                {meterMode === "pending"
                  ? t("dashboard.riskFromPending")
                  : t("dashboard.riskFromAverage", { count: recentDecisions.length })}
              </p>
              {meterMode === "pending" && riskiestPending && (
                <Link
                  href={`/approvals/${riskiestPending.id}`}
                  className="tap-target inline-flex items-center text-xs text-primary hover:underline"
                >
                  {t("dashboard.viewApproval")}
                </Link>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("dashboard.riskConcentrationTitle")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.riskConcentrationHint", { count: riskConcentrationTotal })}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {riskConcentrationRows.map(({ band, count }) => (
                  <li key={band} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                      {tRisk(band)}
                    </span>
                    <span
                      className="h-2 flex-1 overflow-hidden rounded-full bg-card-raised"
                      aria-hidden
                    >
                      <span
                        className={cn("block h-full rounded-full", BAND_BAR_CLASS[band])}
                        style={{ width: `${(count / riskConcentrationMax) * 100}%` }}
                      />
                    </span>
                    <span
                      className="w-6 shrink-0 text-end font-data text-xs text-foreground"
                      aria-label={t("dashboard.riskConcentrationRowLabel", {
                        band: tRisk(band),
                        count,
                      })}
                    >
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section
        aria-labelledby="overview-status-heading"
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="overview-status-heading" className="text-sm font-semibold text-foreground">
            {t("dashboard.statusTitle")}
          </h2>
          <Link
            href="/agents"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RobotIcon className="size-3.5" aria-hidden />
            {t("dashboard.viewAgents")}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {agents.isError ? (
            <ApiErrorState
              error={agents.error}
              onRetry={() => agents.refetch()}
              className="col-span-2 sm:col-span-3 lg:col-span-4"
            />
          ) : agents.isPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : (
            AGENT_STATUSES.map((status) => (
              <StatTile
                key={status}
                label={t(`dashboard.agentStatus.${status}`)}
                value={agentCounts[status]}
              />
            ))
          )}
          <StatTile
            label={t("auditIntegrity")}
            value={
              auditVerify.isPending ? (
                <Skeleton className="h-8 w-24" />
              ) : auditVerify.isError ? (
                <span className="text-base font-normal text-destructive">{t("loadError")}</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {auditVerify.data?.valid ? (
                    <ShieldCheckIcon className="size-5 text-risk-minimal" aria-hidden />
                  ) : (
                    <ShieldWarningIcon className="size-5 text-risk-critical" aria-hidden />
                  )}
                  {auditVerify.data?.valid ? t("auditVerified") : t("auditBroken")}
                </span>
              )
            }
            hint={t("auditIntegrityHint")}
            data-testid="stat-tile-audit-verify"
          />
          <StatTile
            label={t("liveEvents")}
            value={
              live.status === "error" ? (
                <span className="text-base font-normal text-destructive">
                  {tApiError("unavailable.title")}
                </span>
              ) : (
                live.count
              )
            }
            hint={t("liveEventsHint")}
            accessory={
              live.status === "open" ? (
                <CellTowerIcon className="size-3.5 text-risk-minimal" aria-hidden />
              ) : (
                <BroadcastIcon
                  className="size-3.5 animate-pulse text-muted-foreground"
                  aria-hidden
                />
              )
            }
            data-testid="stat-tile-live-events"
          />
        </div>
      </section>

      <section
        aria-labelledby="overview-activity-heading"
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="overview-activity-heading" className="text-sm font-semibold text-foreground">
            {t("dashboard.recentActivityTitle")}
          </h2>
          <Link
            href="/audit"
            className="tap-target inline-flex items-center text-xs text-primary hover:underline"
          >
            {t("dashboard.viewAllActivity")}
          </Link>
        </div>
        {recentAudit.isError ? (
          <ApiErrorState error={recentAudit.error} onRetry={() => recentAudit.refetch()} />
        ) : recentAudit.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : recentItems.length === 0 ? (
          <EmptyState
            icon={PulseIcon}
            description={t("dashboard.recentActivityEmpty")}
            className="border-none py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentItems.map((event) => {
              const actor = event.actor as unknown as { type: string; id: string };
              return (
                <li key={event.eventId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-36 shrink-0 font-data text-xs text-muted-foreground">
                    {format.dateTime(new Date(event.timestamp), {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <Link
                    href={`/audit/${event.eventId}`}
                    title={event.eventType}
                    className="flex-1 truncate text-foreground hover:text-primary hover:underline"
                  >
                    <EventTypeLabel event={event} />
                  </Link>
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                    {resolveActorName(actor)}
                  </span>
                  {typeof event.riskScore === "number" && (
                    <RiskBadge score={event.riskScore} className="shrink-0" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
