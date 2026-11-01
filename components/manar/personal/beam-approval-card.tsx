"use client";

import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Link } from "@/i18n/navigation";
import { useApprovalDetail, useDecideApproval, type ApprovalSummary } from "@/hooks/use-approvals";
import { useDecisionKeys } from "@/hooks/use-decision-keys";
import { toolDisplayName } from "@/lib/personal/tool-stats";
import { Button } from "@/components/ui/button";

export interface BeamApprovalCardProps {
  /** The oldest pending approval. */
  approval: ApprovalSummary;
  /** How many more are waiting behind it. */
  moreCount?: number;
  /**
   * Show "Approve for 8 hours" and "Approve + make rule". The current API only knows approve
   * and deny, so these stay hidden until the approvals track ships grants and rules.
   */
  extendedGrants?: boolean;
  onApprove8h?: (approval: ApprovalSummary) => void;
  onMakeRule?: (approval: ApprovalSummary) => void;
}

/**
 * The beam: the one thing on Home that needs a person. A 5px orange bar on the start edge sweeps
 * in over 400 ms when a new request arrives (off under reduced motion, see globals.css).
 * Keyboard: A approves once (never a longer grant), D denies; see hooks/use-decision-keys.ts for
 * the safety rules.
 */
export function BeamApprovalCard({
  approval,
  moreCount = 0,
  extendedGrants = false,
  onApprove8h,
  onMakeRule,
}: BeamApprovalCardProps) {
  const t = useTranslations("personal.approval");
  const format = useFormatter();
  const detail = useApprovalDetail(approval.id);
  const decide = useDecideApproval(approval.id);
  const [done, setDone] = useState<null | "approved" | "denied">(null);

  const answer = useCallback(
    (decision: "APPROVE" | "DENY") => {
      if (decide.isPending || done) return;
      decide.mutate(
        { decision },
        {
          onSuccess: (result) => {
            if (result.status === "already-decided") {
              toast.message(t("alreadyDecided"));
              return;
            }
            setDone(result.outcomeStatus === "APPROVED" ? "approved" : "denied");
          },
          onError: () => toast.error(t("failed")),
        },
      );
    },
    [decide, done, t],
  );

  useDecisionKeys({
    requestId: approval.id,
    onApprove: () => answer("APPROVE"),
    onDeny: () => answer("DENY"),
    enabled: !done,
  });

  const reason = detail.data?.requiredReason;
  const busy = decide.isPending || done !== null;

  return (
    <section
      aria-labelledby="beam-title"
      data-testid="beam-approval-card"
      className="relative grid gap-3 overflow-hidden rounded-xl border border-border bg-card py-4 ps-6 pe-5"
    >
      <span
        aria-hidden
        className="animate-beam-sweep absolute inset-y-0 start-0 w-[5px] origin-top bg-orange"
      />
      <div className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {t("eyebrow")} · {format.dateTime(new Date(approval.requestedAt), { timeStyle: "short" })}
        </span>
        <span className="flex items-center gap-2">
          {t("approveKey")} <kbd className="kbd">A</kbd> {t("denyKey")} <kbd className="kbd">D</kbd>
        </span>
      </div>
      <h3 id="beam-title" className="text-lg font-medium text-foreground">
        {t("wantsTo", {
          tool: toolDisplayName(approval.toolId),
          action: approval.actionId,
          resource: approval.resource,
        })}
      </h3>
      {reason && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {reason === "policy_requires_approval" ? t("reasonPolicy") : t("reasonRisk")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {done ? (
          <p role="status" className="text-sm font-medium text-foreground">
            {done === "approved" ? t("doneApproved") : t("doneDenied")}
          </p>
        ) : (
          <>
            <Button variant="primary" disabled={busy} onClick={() => answer("APPROVE")}>
              {t("approveOnce")}
            </Button>
            {extendedGrants && (
              <>
                <Button variant="secondary" disabled={busy} onClick={() => onApprove8h?.(approval)}>
                  {t("approve8h")}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => onMakeRule?.(approval)}>
                  {t("makeRule")}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => answer("DENY")}
              className="border-deny text-deny hover:bg-deny-soft"
            >
              {t("deny")}
            </Button>
          </>
        )}
      </div>
      {moreCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("more", { count: moreCount })} ·{" "}
          <Link href="/approvals" className="link-text">
            {t("all")}
          </Link>
        </p>
      )}
    </section>
  );
}
