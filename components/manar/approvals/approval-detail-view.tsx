"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApiErrorPanel } from "@/components/manar/api-error-state";
import { isNotFoundError } from "@/lib/api/errors";
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
 * requested/expires timestamps, and the policy version id.
 *
 * Release 2026-11-11: this card previously carried two honest "not
 * available" panels, because manar-api's list DTO exposed only
 * tool/action/resource/risk metadata — an approver was binding a
 * cryptographic grant to a parameter snapshot they had never been shown.
 * `GET /approvals/:id` now returns that snapshot, so both panels are
 * replaced with real data:
 *
 *  - **Why approval was required** — the persisted reason, plus the risk
 *    breakdown with deterministic and AI-attributed factors kept visually
 *    separate. `aiAdvisoryScore: null` renders as "no AI signal", never as
 *    0: those are different facts. Fields not recorded on rows predating
 *    the change render as "not recorded", never as a zero.
 *  - **Parameters** — the redacted payload, the count and paths of
 *    anything withheld (so a partial object is never read as complete),
 *    a truncation warning, and the `parameterDigest` the grant binds to.
 *
 * Redaction upstream is key-name based, not content-based DLP, which is
 * why the intro copy says "credential-shaped values" rather than implying
 * a guarantee.
 */
export function ApprovalDetailView({ approvalId }: { approvalId: string }) {
  const t = useTranslations("approvals.card");
  const tApprovals = useTranslations("approvals");
  const tDetail = useTranslations("approvals.detail");
  const format = useFormatter();
  const { data: approval, isPending, isError, error } = useApprovalDetail(approvalId);
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

  if (isError && !isNotFoundError(error)) {
    return <ApiErrorPanel title={tApprovals("title")} error={error} />;
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

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("explanationTitle")}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label={t("requiredReason")}
            value={
              approval.requiredReason === "policy_requires_approval" ? (
                t("reasonPolicy")
              ) : approval.requiredReason === "risk_ceiling_exceeded" ? (
                t("reasonRiskCeiling")
              ) : (
                <span className="text-muted-foreground">{t("notRecorded")}</span>
              )
            }
          />
          <Field
            label={t("deterministicScore")}
            value={
              approval.deterministicRiskScore === null ? (
                <span className="text-muted-foreground">{t("notRecorded")}</span>
              ) : (
                <span className="font-data">{approval.deterministicRiskScore}</span>
              )
            }
          />
          <Field
            label={t("aiAdvisoryScore")}
            value={
              approval.aiAdvisoryScore === null ? (
                /* Deliberately not rendered as 0: null means no advisory
                 * signal was available, which is a different fact from the
                 * AI having assessed this as zero risk. */
                <span className="text-muted-foreground">{t("noAiSignal")}</span>
              ) : (
                <span className="font-data">{approval.aiAdvisoryScore}</span>
              )
            }
          />
        </div>

        {approval.taskRiskCeiling !== null && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("ceilingContext", {
              score: approval.riskScore,
              ceiling: approval.taskRiskCeiling,
            })}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("deterministicFactors")}
            </span>
            {approval.deterministicReasonCodes.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{t("noFactors")}</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {approval.deterministicReasonCodes.map((code) => (
                  <li
                    key={code}
                    className="rounded border border-border bg-muted/30 px-1.5 py-0.5 font-data text-xs"
                  >
                    {code}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("aiAdvisoryFactors")}
            </span>
            {approval.aiAdvisoryReasonCodes.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{t("noAiFactors")}</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {approval.aiAdvisoryReasonCodes.map((code) => (
                  <li
                    key={code}
                    className="rounded border border-dashed border-border px-1.5 py-0.5 font-data text-xs"
                  >
                    {code}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t("paramsTitle")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("paramsIntro")}</p>

        {/* Raw JSON is pinned LTR: an Arabic UI must not reorder a
         * structural payload the reviewer is being asked to bind to. */}
        <pre
          dir="ltr"
          className="max-h-80 overflow-auto rounded border border-border bg-muted/20 p-3 text-start font-data text-xs"
        >
          {JSON.stringify(approval.params, null, 2)}
        </pre>

        {approval.parametersTruncated && (
          <p className="mt-2 text-xs text-risk-high">{t("paramsTruncated")}</p>
        )}

        {approval.redactedKeyPaths.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("paramsRedacted", { count: approval.redactedKeyPaths.length })}{" "}
            <span dir="ltr" className="font-data">
              {approval.redactedKeyPaths.join(", ")}
            </span>
          </p>
        )}

        <div className="mt-3 flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">{t("digest")}</span>
          <span dir="ltr" className="font-data text-xs break-all text-foreground">
            {approval.parameterDigest}
          </span>
          <span className="text-xs text-muted-foreground">{t("digestHint")}</span>
        </div>
      </section>

      {approval.expectedEffect !== null && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("effectTitle")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label={t("effectAction")}
              value={
                <span className="font-data">{String(approval.expectedEffect.actionName)}</span>
              }
            />
            <Field
              label={t("effectMutating")}
              value={approval.expectedEffect.mutating ? t("yes") : t("no")}
            />
            <Field
              label={t("effectDestructive")}
              value={
                approval.expectedEffect.destructive ? (
                  <span className="font-medium text-risk-high">{t("yes")}</span>
                ) : (
                  t("no")
                )
              }
            />
            <Field
              label={t("effectClassification")}
              value={
                <span className="font-data">{String(approval.expectedEffect.classification)}</span>
              }
            />
          </div>
        </section>
      )}

      {approval.status === "PENDING" && (
        <section className="rounded-lg border border-border bg-card p-4">
          <ApprovalDecideButtons approvalId={approval.id} />
        </section>
      )}
    </div>
  );
}
