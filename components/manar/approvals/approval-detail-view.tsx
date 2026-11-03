"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApiErrorPanel } from "@/components/manar/api-error-state";
import { isNotFoundError } from "@/lib/api/errors";
import { ApprovalStatusBadge } from "@/components/manar/approvals/approval-status-badge";
import { ApprovalDecideButtons } from "@/components/manar/approvals/approval-decide-buttons";
import { ApprovalRevokeSection } from "@/components/manar/approvals/approval-revoke-section";
import { RiskMeter } from "@/components/manar/risk-meter";
import { ActionCategoryBadge, actionCategory } from "@/components/manar/action-category-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalDetail } from "@/hooks/use-approvals";
import { useAgentDetail } from "@/hooks/use-agents";
import { useTaskDetail } from "@/hooks/use-tasks";
import { useToolActionLookup } from "@/hooks/use-tools";
import { useUserNameResolver } from "@/components/manar/ai-systems/user-name";
import { ApprovalHandover } from "@/components/manar/approvals/approval-handover";
import { useUsersList } from "@/hooks/use-users";
import type { ReactNode } from "react";

/** Fields manar-api added on 3 Nov 2026 (decision rights and revoke); typed by hand until codegen. */
interface DecideShape {
  id: string;
  expiresAt: string;
  allowedDecisions?: string[];
  needs?: string | null;
  why?: string | null;
}
interface RevokeShape {
  id: string;
  status: string;
  canRevoke?: boolean;
  releasedAt?: string | null;
  grantConsumedAt?: string | null;
  revokedAt?: string | null;
  revokedByName?: string | null;
  usedBeforeRevoke?: boolean | null;
}

/** `GET /approvals/:id` `decisions[]` items (typed loosely in the OpenAPI document). */
interface RecordedDecision {
  decision: string;
  approverId: string;
  decidedAt: string;
  reason: string | null;
}

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
export function ApprovalDetailView({
  approvalId,
  viewerSubject,
}: {
  approvalId: string;
  /** The signed-in person's identity-provider subject, used to tell whether they approved this request. */
  viewerSubject?: string;
}) {
  const t = useTranslations("approvals.card");
  const tApprovals = useTranslations("approvals");
  const tDetail = useTranslations("approvals.detail");
  const format = useFormatter();
  const { data: approval, isPending, isError, error } = useApprovalDetail(approvalId);
  const { data: agent } = useAgentDetail(approval?.agentId ?? "");
  const { data: task } = useTaskDetail(approval?.taskId ?? "");
  const resolveUserName = useUserNameResolver();
  const lookupAction = useToolActionLookup();
  const users = useUsersList();
  const viewerUserId =
    users.data?.pages
      .flatMap((page) => page.items)
      .find((user) => viewerSubject && user.keycloakSubject === viewerSubject)?.id ?? null;

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

  // manar-api's own lookup misses when the request stores action names
  // (expectedEffect: null). Fall back to the registry's *current* row, and
  // label it as such below; an ambiguous or missing match stays unknown.
  const registryAction = lookupAction(approval.toolId, approval.actionId)?.action;
  const effect =
    approval.expectedEffect ??
    (registryAction
      ? {
          actionName: registryAction.name,
          mutating: registryAction.mutating,
          destructive: registryAction.destructive,
          classification: registryAction.classification,
        }
      : null);

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
        <ArrowLeftIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
        {tDetail("backToList")}
      </Link>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label={t("agent")}
            value={
              <Link href={`/agents/${approval.agentId}`} className="link-text">
                {agent?.displayName ?? approval.agentId}
              </Link>
            }
          />
          <Field
            label={t("task")}
            value={
              <Link href={`/tasks/${approval.taskId}`} className="link-text">
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
          <p className="mt-2 text-xs text-wait">{t("paramsTruncated")}</p>
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

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("effectTitle")}</h2>
          <ActionCategoryBadge category={actionCategory(effect)} />
        </div>
        {approval.expectedEffect === null && effect !== null && (
          <p
            className="mb-3 rounded-md border border-transparent bg-wait-soft px-2 py-1 text-xs text-foreground"
            data-effect-source="registry"
          >
            {t("effectFromRegistry")}
          </p>
        )}
        {effect === null ? (
          <p className="text-sm text-muted-foreground">{t("effectUnknown")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label={t("effectAction")}
              value={<span className="font-data">{String(effect.actionName)}</span>}
            />
            <Field label={t("effectMutating")} value={effect.mutating ? t("yes") : t("no")} />
            <Field
              label={t("effectDestructive")}
              value={
                effect.destructive ? (
                  <span className="font-medium text-wait">{t("yes")}</span>
                ) : (
                  t("no")
                )
              }
            />
            <Field
              label={t("effectClassification")}
              value={<span className="font-data">{String(effect.classification)}</span>}
            />
          </div>
        )}
      </section>

      {/* GATE-0 F15: who decided, and whether the one-use grant was issued
       * and redeemed. Redeemed is not "executed successfully"; the outcome
       * is in the audit trail. */}
      <section
        aria-labelledby="approval-outcome-heading"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 id="approval-outcome-heading" className="mb-3 text-sm font-semibold text-foreground">
          {t("decisionsTitle")}
        </h2>
        {approval.decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {approval.status === "PENDING" ? t("noDecisionYet") : t("noDecisionRecorded")}
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-border" data-testid="approval-decisions">
            {(approval.decisions as unknown as RecordedDecision[]).map((decision, index) => (
              <li
                key={`${decision.decidedAt}-${index}`}
                className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm"
              >
                <span className="font-medium text-foreground">
                  {decision.decision === "APPROVE"
                    ? t("decisionApprove")
                    : decision.decision === "DENY"
                      ? t("decisionDeny")
                      : decision.decision}
                </span>
                <span className="text-muted-foreground">
                  {resolveUserName(decision.approverId)}
                </span>
                <span className="font-data text-xs text-muted-foreground">
                  {format.dateTime(new Date(decision.decidedAt), {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </span>
                <span className="basis-full text-muted-foreground">
                  {decision.reason ? decision.reason : t("noDecisionReason")}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("grantTitle")}
            value={
              !approval.grantIssued ? (
                <span className="text-muted-foreground">{t("grantNotIssued")}</span>
              ) : approval.grantConsumedAt === null ? (
                t("grantIssuedUnused")
              ) : (
                t("grantRedeemed", {
                  at: format.dateTime(new Date(approval.grantConsumedAt), {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  }),
                })
              )
            }
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("grantHint")}</p>
      </section>

      {approval.status === "PENDING" && (
        <section className="rounded-lg border border-border bg-card p-4">
          <ApprovalDecideButtons approval={approval as unknown as DecideShape} />
        </section>
      )}
      <ApprovalRevokeSection approval={approval as unknown as RevokeShape} />
      <ApprovalHandover
        approvalId={approval.id}
        actionName={effect ? String(effect.actionName) : null}
        approverUserId={
          (approval.decisions as unknown as RecordedDecision[]).find(
            (decision) => decision.decision === "APPROVE",
          )?.approverId ?? null
        }
        viewerUserId={viewerUserId}
      />
    </div>
  );
}
