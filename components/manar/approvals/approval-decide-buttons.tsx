"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDecideApproval, type ApprovalDecision } from "@/hooks/use-approvals";
import { apiErrorMessage } from "@/lib/api/errors";

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
 */
export function ApprovalDecideButtons({ approvalId }: { approvalId: string }) {
  const t = useTranslations("approvals.decide");
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
          // Deliberately a neutral "submitted" toast, not "approved"/
          // "denied" — decide() only signals the workflow and returns
          // (manar-api's own doc comment), it doesn't confirm this
          // decision is the one that actually took effect. Verified live:
          // firing two genuinely concurrent decide calls (APPROVE vs
          // DENY) on the same PENDING request, manar-api's own optimistic
          // pre-check let *both* signals through (both 201s — the
          // pre-check race window is real), and the workflow's own
          // sequential signal handling resolved it to exactly one final
          // decision, not a split-brain state. A toast naming this tab's
          // own submitted decision would have been wrong for whichever
          // tab lost that race; the polling badge (useApprovalDetail's
          // refetchInterval) is what shows the real, current, authoritative
          // status.
          toast.success(t("submittedToast"));
        },
        onError: () => toast.error(t("error")),
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
