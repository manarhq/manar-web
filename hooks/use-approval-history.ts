"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

export type HistoryStatus = "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "REVOKED";

/** One row of `GET /approvals/history` (manar-api): an agent or a device approval. */
export interface HistoryItem {
  kind: "agent" | "host";
  id: string;
  requestedAt: string;
  status: HistoryStatus;
  toolId: string;
  actionId: string;
  resource: string;
  source:
    | { type: "device"; hostId: string; name: string }
    | { type: "agent"; agentId: string; name: string; taskId: string };
  riskScore: number | null;
  decision: "approve_once" | "approve_8h" | "approve_always" | "deny" | null;
  decidedByName: string | null;
  decidedVia: string | null;
  decidedAt: string | null;
  reason: string | null;
  endReason: string | null;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  revokedByName: string | null;
  revokeNote: string | null;
  usedBeforeRevoke: boolean | null;
  standing: {
    kind: "grant" | "block" | "site_rule";
    id: string;
    mode?: string;
    expiresAt: string | null;
    revokedAt: string | null;
    useCount?: number;
  }[];
  allowedDecisions: string[];
  needs: string | null;
  why: string | null;
  canRevoke: boolean;
}

interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
  seesAll: boolean;
}

/** Every approval, agent and device, newest first. Polls while something on screen is pending. */
export function useApprovalHistory(status?: HistoryStatus) {
  return useInfiniteQuery({
    queryKey: ["approvals", "history", status ?? "ALL"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const q = new URLSearchParams({ limit: "50" });
      if (status) q.set("status", status);
      if (pageParam) q.set("cursor", pageParam);
      return bffJson<HistoryPage>(`/approvals/history?${q.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) => p.items.some((i) => i.status === "PENDING"))
        ? 5000
        : false,
  });
}

export interface RevokeResult {
  id: string;
  status: "REVOKED";
  usedBeforeRevoke: boolean;
  withdrawn: number;
  blockId: string | null;
  incidentId: string | null;
}

/** Revoke: cancelled if the device or agent had not received it yet, otherwise flagged. */
export function useRevokeApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: "agent" | "host"; id: string; note?: string }) =>
      bffJson<RevokeResult>(
        `/${input.kind === "host" ? "host-approvals" : "approvals"}/${encodeURIComponent(input.id)}/revoke`,
        { method: "POST", body: input.note ? { note: input.note } : {} },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });
}

/** Withdraw an 8-hour approval, or lift a block left by a revoked-after-use approval. */
export function useEndStanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: "grant" | "block" | "site_rule"; id: string }) =>
      input.kind === "site_rule"
        ? bffJson<unknown>(`/jail/site-rules/${encodeURIComponent(input.id)}`, {
            method: "DELETE",
          })
        : bffJson<unknown>(`/approvals/allow-grants/${encodeURIComponent(input.id)}/revoke`, {
            method: "POST",
          }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });
}
