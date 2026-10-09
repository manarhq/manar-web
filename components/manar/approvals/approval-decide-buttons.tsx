"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDecideApproval, type ApprovalDecision } from "@/hooks/use-approvals";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

/**
 * Section 65's race-safety requirement, applied at every layer this
 * frontend controls:
 *  - Both buttons disable the instant either is clicked (`isPending`
 *    covers both, since they share one mutation) — a second physical
 *    click on the same button, or the other button, cannot fire a second
 *    request while the first is in flight.
 *  - A genuine race (another tab, another approver) is handled by
 *    treating manar-api's `409` as a real, expected outcome
 *    (`status === "already-decided"`) rather than an error — shown as
 *    its own clear state, never a raw failure message.
 *  - Phase 14 security cleanup 1: `decide()` now synchronously awaits and
 *    returns the workflow's real, final outcome (see `useDecideApproval`'s
 *    doc comment) — this component surfaces the case where that outcome
 *    isn't the decision the caller themselves submitted, rather than
 *    assuming a `2xx` means "my decision won."
 */
export function ApprovalDecideButtons({ approvalId }: { approvalId: string }) {
  const t = useTranslations("approvals.decide");
  const tStatus = useTranslations("approvals.status");
  const [reason, setReason] = useState("");
  const [alreadyDecided, setAlreadyDecided] = useState(false);
  const decide = useDecideApproval(approvalId);

  function submit(decision: ApprovalDecision) {
    decide.mutate(
      { decision, reason: reason.trim() || undefined },
      {
        onSuccess: (result) => {
          if (result.status === "already-decided") {
            setAlreadyDecided(true);
            return;
          }
          // Phase 14 security cleanup 1: decide() now synchronously awaits
          // the workflow's real, final outcome before responding, so
          // result.outcomeDecision is the decision that actually took
          // effect — not necessarily result.submittedDecision. The
          // pre-check race window still exists (manar-api's own optimistic
          // PENDING check lets two genuinely concurrent signals both
          // through), but both callers now observe the one true outcome
          // instead of each assuming their own submission won. Verified
          // live: two genuinely concurrent decide calls (APPROVE vs DENY)
          // on the same request both get a 2xx, and both report the same
          // real outcome.
          const outcomeLabel = tStatus(result.outcomeStatus);
          if (
            result.outcomeStatus === "EXPIRED" ||
            (result.outcomeDecision && result.outcomeDecision !== result.submittedDecision)
          ) {
            toast.warning(t("outcomeDiffersToast", { outcome: outcomeLabel }));
          } else if (result.outcomeStatus === "APPROVED") {
            toast.success(t("approvedToast"));
          } else {
            toast.success(t("deniedToast"));
          }
        },
        onError: (error) => {
          if (apiErrorStatus(error) === 504) {
            toast.error(t("timeoutError"));
            return;
          }
          toast.error(t("error"));
        },
      },
    );
  }

  if (alreadyDecided) {
    return (
      <div className="rounded-lg border border-risk-moderate/30 bg-risk-moderate/10 p-3 text-sm text-risk-moderate">
        {t("alreadyDecided")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="approval-reason">{t("reasonLabel")}</Label>
        <Input
          id="approval-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("reasonPlaceholder")}
          maxLength={1000}
          disabled={decide.isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={decide.isPending}
          onClick={() => submit("APPROVE")}
          data-testid="approve-button"
        >
          <CheckIcon />
          {t("approve")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={decide.isPending}
          onClick={() => submit("DENY")}
          data-testid="deny-button"
        >
          <XIcon />
          {t("deny")}
        </Button>
        {decide.isPending && (
          <span className="text-xs text-muted-foreground">{t("submitting")}</span>
        )}
      </div>

      {decide.isError && (
        <p className="text-sm text-destructive">{apiErrorMessage(decide.error)}</p>
      )}

      <p className="text-xs text-muted-foreground">{t("pendingNote")}</p>
    </div>
  );
}
