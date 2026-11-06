"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import type { ApprovalChoice, ApprovalSummary, RuleDraft } from "@/hooks/use-approvals";
import { bffJson } from "@/lib/api/raw";
import { conflictKey, serverMessage } from "@/lib/approvals/conflict";
import {
  UNDO_MS,
  canHold,
  heldIds,
  holdDecision,
  subscribeHeld,
  undoDecision,
} from "@/lib/approvals/hold";
import { stashRuleDraft } from "@/lib/personal/rule-draft";
import { startReauth } from "@/lib/auth/start-reauth";
import { track } from "@/lib/telemetry/track";
import { enablePush, shouldOfferPush } from "@/lib/push/subscribe";

/** Where an approval came from: an agent task, or a device (a tool without a task). */
export type ApprovalKind = "agent" | "host";

/** Why the signed-in person cannot approve it (manar-api's decision rights). */
export type NeedsReason = "admins_only" | "needs_admin" | "needs_another_admin";
/** What makes it sensitive: an approver decides, never the person whose agent asked. */
export type SensitiveReason = "high_risk" | "handover";

export type QueueApproval = ApprovalSummary & {
  kind?: ApprovalKind;
  /** Device approvals carry a plain-words risk explanation (EN and AR). */
  explanation?: { en: string; ar: string };
  /** What the signed-in person may answer; absent on older API responses (then: everything). */
  allowedDecisions?: ApprovalChoice[];
  needs?: NeedsReason | null;
  why?: SensitiveReason | null;
  /** Device approvals: high risk is decided in the console only. */
  highRisk?: boolean;
  /** Approving needs a fresh sign-in first (own high-risk request in a personal workspace). */
  stepUpNeeded?: boolean;
  /** Who and where, for the one-sentence card. */
  hostName?: string;
  ownerName?: string | null;
  agentName?: string;
};

export type Answer = { status: "held" } | { status: "sent" };

/** "Approve + make rule": the draft goes through this tab's sessionStorage; the URL holds only a
 * random reference (lib/personal/rule-draft.ts). */
export function ruleDraftHref(draft: RuleDraft): string {
  return `/rules?draftRef=${stashRuleDraft(draft)}`;
}

interface DecideReply {
  status?: string;
  decision?: string | null;
  ruleDraft?: RuleDraft | null;
  note?: string | null;
}

export type DecisionOutcome = "approved" | "denied" | "expired" | "differs";

/** What the server says happened. Exported for tests. */
export function decisionOutcome(
  status: string | undefined,
  isDevice: boolean,
  approved: boolean,
): DecisionOutcome {
  if (status === "APPROVED") return "approved";
  if (status === "DENIED") return "denied";
  if (status === "EXPIRED") return "expired";
  if (status === undefined || (isDevice && status === "decided")) {
    return approved ? "approved" : "denied";
  }
  return "differs";
}

/** Sends one decision. Plain fetch, not a component mutation: it may run after the card is gone. */
function sendDecision(
  approval: Pick<QueueApproval, "id" | "kind">,
  choice: ApprovalChoice,
  options: { makeRule?: boolean; reason?: string },
): Promise<DecideReply> {
  const path =
    approval.kind === "host"
      ? `/host-approvals/${encodeURIComponent(approval.id)}/decide`
      : `/approvals/${encodeURIComponent(approval.id)}/decide`;
  return bffJson<DecideReply>(path, {
    method: "POST",
    body: {
      decision: choice,
      ...(options.makeRule ? { makeRule: true } : {}),
      ...(options.reason && approval.kind !== "host" ? { reason: options.reason } : {}),
    },
    keepalive: true,
  });
}

/** IDs of decisions held for Undo: the queue hides them so the next request can be read. */
export function useHeldIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeHeld, heldIds, heldIds);
}

/**
 * One way to answer an approval from anywhere (Home, the queue, the detail page). The answer is
 * held for 10 seconds with an Undo toast, then sent; see lib/approvals/hold.ts for how this
 * interacts with a device that is already waiting. Every failure says why in plain words (E-021).
 */
export function useAnswerApproval(approval: Pick<QueueApproval, "id" | "kind" | "expiresAt">) {
  const t = useTranslations("personal.approval");
  const tc = useTranslations("approvals.conflict");
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const answer = useCallback(
    (choice: ApprovalChoice, options: { makeRule?: boolean; reason?: string } = {}): Answer => {
      const approved = choice !== "deny";
      const run = () =>
        sendDecision(approval, choice, options)
          .then((r) => {
            // Only APPROVED counts as approved. A decision that lost to someone else's, or to
            // re-evaluation, says so, and EXPIRED is its own message. The choice stands in only
            // for a device reply that carries no status (or "decided").
            const outcome = decisionOutcome(r.status, approval.kind === "host", approved);
            const effective = outcome === "approved";
            if (outcome === "expired") toast.warning(t("doneExpired"));
            else if (outcome === "differs" || effective !== approved)
              toast.warning(tc("outcomeDiffers"));
            else toast.success(approved ? t("doneApproved") : t("doneDenied"));
            if (r.note === "needs_owner") toast.message(t("noteAlwaysNeedsOwner"));
            else if (r.note === "site_rule_exists") toast.message(t("noteSiteRuleExists"));
            if (effective && r.ruleDraft) router.push(ruleDraftHref(r.ruleDraft));
            else if (effective && shouldOfferPush(window.localStorage)) {
              toast.message(t("pushOffer"), {
                action: { label: t("pushOfferAction"), onClick: () => void enablePush() },
              });
            }
            track("first_approval_answered", { approved: effective });
          })
          .catch((error: unknown) => {
            const key = conflictKey(error);
            if (key === "reauth") {
              toast.error(tc("reauth"), {
                action: {
                  label: tc("reauthAction"),
                  onClick: () => startReauth(locale, "/approvals"),
                },
              });
              return;
            }
            toast.error(key === "forbidden" ? (serverMessage(error) ?? tc("forbidden")) : tc(key));
          })
          // Returned, so the held item stays hidden until the refetch has landed (hold.ts).
          .finally(() => queryClient.invalidateQueries({ queryKey: ["approvals"] }));

      if (!canHold(approval.expiresAt)) {
        // Too little time left to hold it: sent now; a mistake is fixed with Revoke.
        void run();
        toast.message(approved ? t("sentNowApproved") : t("sentNowDenied"));
        return { status: "sent" };
      }
      if (!holdDecision(approval.id, run)) return { status: "held" };
      toast(approved ? t("heldApproved") : t("heldDenied"), {
        id: `held-${approval.id}`,
        duration: UNDO_MS,
        action: {
          label: t("undo"),
          onClick: () => {
            if (undoDecision(approval.id)) toast.message(t("undone"));
          },
        },
      });
      return { status: "held" };
    },
    [approval, locale, queryClient, router, t, tc],
  );

  return { answer, isPending: false };
}
