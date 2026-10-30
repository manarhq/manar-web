"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import {
  useDecideApproval,
  type ApprovalChoice,
  type ApprovalSummary,
  type RuleDraft,
} from "@/hooks/use-approvals";
import { useDecideHostApproval } from "@/hooks/use-host-approvals";
import { enablePush, shouldOfferPush } from "@/lib/push/subscribe";

/** Where an approval came from: an agent task, or a device (a tool without a task). */
export type ApprovalKind = "agent" | "host";
export type QueueApproval = ApprovalSummary & { kind?: ApprovalKind };

export type Answer = { status: "decided"; approved: boolean } | { status: "already-decided" };

/** The rule editor reads the draft from here (`/rules?draft=`), set by "Approve + make rule". */
export function ruleDraftHref(draft: RuleDraft): string {
  return `/rules?draft=${encodeURIComponent(JSON.stringify(draft))}`;
}

/**
 * One way to answer an approval from anywhere (Home, the queue): approve once, for 8 hours, or
 * deny, optionally with a rule. After the first approved answer it offers browser notifications once.
 */
export function useAnswerApproval(approval: Pick<QueueApproval, "id" | "kind">) {
  const t = useTranslations("personal.approval");
  const router = useRouter();
  const agent = useDecideApproval(approval.id);
  const host = useDecideHostApproval(approval.id);

  const answer = useCallback(
    async (choice: ApprovalChoice, options: { makeRule?: boolean } = {}): Promise<Answer> => {
      const makeRule = options.makeRule ? true : undefined;
      let ruleDraft: RuleDraft | null | undefined;
      let approved: boolean;
      if (approval.kind === "host") {
        const r = await host.mutateAsync({ decision: choice, makeRule });
        if (r.status === "already-decided") return { status: "already-decided" };
        ruleDraft = r.ruleDraft;
        approved = choice !== "deny";
      } else {
        const r = await agent.mutateAsync({ decision: choice, makeRule });
        if (r.status === "already-decided") return r;
        ruleDraft = r.ruleDraft;
        approved = r.outcomeStatus === "APPROVED";
      }
      if (approved && ruleDraft) router.push(ruleDraftHref(ruleDraft));
      else if (approved && shouldOfferPush(window.localStorage)) {
        toast.message(t("pushOffer"), {
          action: { label: t("pushOfferAction"), onClick: () => void enablePush() },
        });
      }
      return { status: "decided", approved };
    },
    [agent, host, approval.kind, router, t],
  );

  return { answer, isPending: agent.isPending || host.isPending };
}
