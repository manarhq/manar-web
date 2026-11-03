"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApprovalChoice } from "@/hooks/use-approvals";
import { useAnswerApproval, type NeedsReason } from "@/hooks/use-answer-approval";
import { DECISION_KEYS_ARM_MS } from "@/hooks/use-decision-keys";
import { startReauth } from "@/lib/auth/start-reauth";

/**
 * The detail page's answer: only the choices this person may make (manar-api's decision rights),
 * with a line saying why the others are missing. "Just this once" first, Deny at the far end; held
 * 10 seconds with Undo like everywhere else (lib/approvals/hold.ts). The parameters are on this
 * page, above, so approving here is approving what was read.
 */
export function ApprovalDecideButtons({
  approval,
}: {
  approval: {
    id: string;
    expiresAt: string;
    allowedDecisions?: string[];
    needs?: string | null;
    why?: string | null;
    stepUpNeeded?: boolean;
  };
}) {
  const t = useTranslations("approvals.decide");
  const tp = useTranslations("personal.approval");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [armed, setArmed] = useState(false);
  const locale = useLocale();
  const { answer } = useAnswerApproval({ ...approval, kind: "agent" });
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), DECISION_KEYS_ARM_MS);
    return () => clearTimeout(timer);
  }, []);

  const allowed = (approval.allowedDecisions ?? ["approve_once", "deny"]) as ApprovalChoice[];
  const decide = (choice: ApprovalChoice) => {
    if (sent || !armed) return;
    setSent(true);
    answer(choice, { reason: reason.trim() || undefined });
  };

  if (sent)
    return (
      <p role="status" className="text-sm">
        {t("sent")}
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      {approval.why && !approval.needs && (
        <p role="note" className="text-sm text-foreground">
          {approval.stepUpNeeded ? tp("stepUpNote", { why: approval.why }) : tp("selfConfirmNote")}
        </p>
      )}
      {approval.needs && (
        <p role="note" className="text-sm text-foreground">
          {tp(`needs.${approval.needs as NeedsReason}`, { why: approval.why ?? "none" })}
        </p>
      )}
      {allowed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approval-reason">{t("reasonLabel")}</Label>
          <Input
            id="approval-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={1000}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {allowed.includes("approve_once") &&
          (approval.stepUpNeeded ? (
            <Button
              type="button"
              size="lg"
              onClick={() => startReauth(locale, `/approvals/${approval.id}`)}
            >
              {tp("stepUpButton")}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={!armed}
              onClick={() => decide("approve_once")}
              data-testid="approve-button"
            >
              {tp("justOnce")}
            </Button>
          ))}
        {allowed.includes("approve_8h") && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={!armed}
            onClick={() => decide("approve_8h")}
          >
            {tp("approve8h")}
          </Button>
        )}
        {allowed.includes("deny") && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!armed}
            onClick={() => decide("deny")}
            className="ms-auto border-deny text-deny hover:bg-deny-soft"
            data-testid="deny-button"
          >
            {tp("deny")}
          </Button>
        )}
      </div>
    </div>
  );
}
