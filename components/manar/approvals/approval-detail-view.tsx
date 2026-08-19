"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon, InfoIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApprovalStatusBadge } from "@/components/manar/approvals/approval-status-badge";
import { ApprovalDecideButtons } from "@/components/manar/approvals/approval-decide-buttons";
import { RiskMeter } from "@/components/manar/risk-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalDetail } from "@/hooks/use-approvals";
import { useAgentDetail } from "@/hooks/use-agents";
import { useTaskDetail } from "@/hooks/use-tasks";
import type { ReactNode } from "react";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

/**
 * Section 65's approval card. Every field manar-api's
 * `ApprovalRequestSummaryDto` actually returns is shown for real: agent
 * (resolved via GET /agents, same "no GET :id" scan every other detail
 * page uses), task, tool, action, resource, risk score, status,
 * requested/expires timestamps, and the policy version id (linked once
 * Phase policies exist). Two fields the design spec's illustrative card
 * lists — invocation params and a structured "why approval was
 * required" explanation beyond the risk score — are **not** present on
 * this DTO; rather than fabricate them, this card says so explicitly
 * (approvals.card.paramsUnavailable/explanationUnavailable).
 */
export function ApprovalDetailView({ approvalId }: { approvalId: string }) {
  const t = useTranslations("approvals.card");
  const tApprovals = useTranslations("approvals");
  const tDetail = useTranslations("approvals.detail");
  const format = useFormatter();
  const { data: approval, isPending, isError } = useApprovalDetail(approvalId);
  const { data: agent } = useAgentDetail(approval?.agentId ?? "");
  const { data: task } = useTaskDetail(approval?.taskId ?? "");

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !approval) {
    return <NotFoundPanel title={tApprovals("title")} body={tDetail("notFoundBody")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${approval.toolId} · ${approval.actionId}`}
        description={approval.resource}
        actions={<ApprovalStatusBadge status={approval.status} />}
      />

      <Link
        href="/approvals"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {tDetail("backToList")}
      </Link>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label={t("agent")}
            value={
              <Link href={`/agents/${approval.agentId}`} className="text-primary hover:underline">
                {agent?.displayName ?? approval.agentId}
              </Link>
            }
          />
          <Field
            label={t("task")}
            value={
              <Link href={`/tasks/${approval.taskId}`} className="text-primary hover:underline">
                {task?.name ?? approval.taskId}
              </Link>
            }
          />
          <Field label={t("tool")} value={<span className="font-mono">{approval.toolId}</span>} />
          <Field
            label={t("action")}
            value={<span className="font-mono">{approval.actionId}</span>}
          />
          <Field
            label={t("resource")}
            value={<span className="font-mono break-all">{approval.resource}</span>}
          />
          <Field
            label={t("policy")}
            value={
              approval.policyVersionId ? (
                <span className="font-mono text-xs">{approval.policyVersionId}</span>
              ) : (
                <span className="text-muted-foreground">{t("noPolicy")}</span>
              )
            }
          />
          <Field
            label={t("requestedAt")}
            value={format.dateTime(new Date(approval.requestedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <Field
            label={t("expiresAt")}
            value={format.dateTime(new Date(approval.expiresAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
        {/* The signature risk gauge (design-rework.md's Signature element)
         * is the featured element on this card — a dedicated column next
         * to the fields, not an afterthought stacked below them. */}
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-4 lg:min-w-52">
          <RiskMeter score={approval.riskScore} label={t("risk")} />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("paramsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("paramsUnavailable")}</p>
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("explanationTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("explanationUnavailable")}</p>
      </section>

      {approval.status === "PENDING" && (
        <section className="rounded-lg border border-border bg-card p-4">
          <ApprovalDecideButtons approvalId={approval.id} />
        </section>
      )}
    </div>
  );
}
