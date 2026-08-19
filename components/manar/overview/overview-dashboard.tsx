"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  Bot,
  ClipboardCheck,
  Gauge,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Radio,
  RadioTower,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { RiskMeter } from "@/components/manar/risk-meter";
import { RiskBadge } from "@/components/manar/risk-badge";
import { EmptyState } from "@/components/manar/empty-state";
import { StatTile } from "@/components/manar/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalsList } from "@/hooks/use-approvals";
import { useAgentsList, type AgentStatus } from "@/hooks/use-agents";
import { useAuditSearch } from "@/hooks/use-audit";
import { useAuditVerify } from "@/hooks/use-audit-verify";
import { useLiveEventCount } from "@/hooks/use-live-event-count";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import { humanizeEventType } from "@/lib/humanize-event-type";

const AGENT_STATUSES: AgentStatus[] = ["ACTIVE", "REVOKED", "KILLED", "PENDING_ENROLLMENT"];

/**
 * /overview's real dashboard (design-rework.md's Layout section): the
 * RiskMeter signature element showing a genuinely meaningful aggregate,
 * an agent status summary, a pending-approvals callout, and a recent-
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
 */
export function OverviewDashboard() {
  const t = useTranslations("overview");
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
  const meterMode: "pending" | "average" | "none" = riskiestPending
    ? "pending"
    : averageRecentRisk !== null
      ? "average"
      : "none";
  const meterScore = riskiestPending?.riskScore ?? averageRecentRisk ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
          <h2 className="self-start text-sm font-semibold text-foreground">
            {t("dashboard.riskTitle")}
          </h2>
          {meterLoading ? (
            <Skeleton className="mt-4 h-32 w-40" />
          ) : meterMode === "none" ? (
            <EmptyState
              icon={Gauge}
              description={t("dashboard.riskEmpty")}
              className="w-full border-none py-8"
            />
          ) : (
            <>
              <RiskMeter score={meterScore} className="mt-1" />
              <p className="max-w-56 text-center text-xs text-muted-foreground">
                {meterMode === "pending"
                  ? t("dashboard.riskFromPending")
                  : t("dashboard.riskFromAverage", { count: recentDecisions.length })}
              </p>
              {meterMode === "pending" && riskiestPending && (
                <Link
                  href={`/approvals/${riskiestPending.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {t("dashboard.viewApproval")}
                </Link>
              )}
            </>
          )}
        </section>

        <section className="flex flex-col rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t("dashboard.agentsTitle")}
          </h2>
          {agents.isPending ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-2 gap-2">
              {AGENT_STATUSES.map((status) => (
                <StatTile
                  key={status}
                  label={t(`dashboard.agentStatus.${status}`)}
                  value={agentCounts[status]}
                />
              ))}
            </div>
          )}
          <Link
            href="/agents"
            className="mt-3 inline-flex items-center gap-1 self-start text-xs text-primary hover:underline"
          >
            <Bot className="size-3.5" aria-hidden />
            {t("dashboard.viewAgents")}
          </Link>
        </section>

        <section className="flex flex-col gap-3">
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
                    <ShieldCheck className="size-5 text-risk-minimal" aria-hidden />
                  ) : (
                    <ShieldAlert className="size-5 text-risk-critical" aria-hidden />
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
            value={live.count}
            hint={t("liveEventsHint")}
            accessory={
              live.status === "open" ? (
                <RadioTower className="size-3.5 text-risk-minimal" aria-hidden />
              ) : (
                <Radio className="size-3.5 animate-pulse text-muted-foreground" aria-hidden />
              )
            }
            data-testid="stat-tile-live-events"
          />
        </section>
      </div>

      {pendingItems.length > 0 && (
        <Link
          href="/approvals"
          className="flex items-center justify-between gap-3 rounded-lg border border-risk-moderate/40 bg-risk-moderate/10 px-4 py-3 text-sm transition-colors hover:bg-risk-moderate/15"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ClipboardCheck className="size-4 text-risk-moderate" aria-hidden />
            {t("dashboard.pendingApprovalsCallout", { count: pendingItems.length })}
          </span>
          <span className="text-xs text-primary">{t("dashboard.reviewApprovals")}</span>
        </Link>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {t("dashboard.recentActivityTitle")}
        </h2>
        {recentAudit.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : recentItems.length === 0 ? (
          <EmptyState
            icon={Activity}
            description={t("dashboard.recentActivityEmpty")}
            className="border-none py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentItems.map((event) => {
              const actor = event.actor as unknown as { type: string; id: string };
              return (
                <li key={event.eventId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
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
                    {humanizeEventType(event.eventType)}
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
        <Link href="/audit" className="mt-3 inline-block text-xs text-primary hover:underline">
          {t("dashboard.viewAllActivity")}
        </Link>
      </section>
    </div>
  );
}
