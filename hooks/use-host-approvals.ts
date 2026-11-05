"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BffError, bffJson } from "@/lib/api/raw";
import type { ApprovalChoice, RuleDraft } from "@/hooks/use-approvals";

/** An approval a device opened (a tool without a task, such as Cursor through its hook). */
export interface HostApprovalItem {
  id: string;
  hostId: string;
  toolId: string;
  actionId: string;
  resource: string;
  summary: string;
  highRisk: boolean;
  /** Plain-words risk text from manar-api's deterministic templates, in both languages. */
  explanation?: { en: string; ar: string };
  expiresAt: string;
  createdAt: string;
  /** After the 3rd identical approval: "always allow this here" for this folder, site or tool. */
  ruleOffer?: { scope: string; approvals: number; lastsDays?: number } | null;
  /** The device and its owner, for "Cursor on Sara's laptop wants to ...". */
  hostName?: string;
  ownerName?: string | null;
  /** What the signed-in person may answer, and why not (manar-api's decision rights). */
  allowedDecisions?: ApprovalChoice[];
  needs?: "admins_only" | "needs_admin" | "needs_another_admin" | null;
  why?: "high_risk" | "handover" | null;
  /** Approving needs a fresh sign-in first (a personal owner's own sensitive request). */
  stepUpNeeded?: boolean;
}

/** `GET /host-approvals`: pending device approvals, polled gently. */
export function useHostApprovals() {
  return useQuery({
    queryKey: ["approvals", "host"],
    queryFn: async () => (await bffJson<{ items: HostApprovalItem[] }>("/host-approvals")).items,
    refetchInterval: 5000,
    // A tenant without device approvals, or a role without access, simply has none.
    retry: false,
  });
}

export interface HostDecideResult {
  status: "decided" | "already-decided";
  grantId?: string | null;
  ruleDraft?: RuleDraft | null;
  /** Why a longer answer was narrowed to "once": needs_owner or site_rule_exists. */
  note?: string | null;
}

export function useDecideHostApproval(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decision: ApprovalChoice;
      makeRule?: boolean;
    }): Promise<HostDecideResult> => {
      try {
        const r = await bffJson<{
          grantId: string | null;
          ruleDraft: RuleDraft | null;
          note?: string | null;
        }>(`/host-approvals/${encodeURIComponent(id)}/decide`, { method: "POST", body: input });
        return {
          status: "decided",
          grantId: r.grantId,
          ruleDraft: r.ruleDraft,
          note: r.note ?? null,
        };
      } catch (error) {
        if (error instanceof BffError && error.status === 409) return { status: "already-decided" };
        throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });
}
