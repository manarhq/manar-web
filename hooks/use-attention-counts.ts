"use client";

import { useApprovalsList } from "@/hooks/use-approvals";
import { useIncidentsList } from "@/hooks/use-incidents";

export interface AttentionCount {
  count: number;
  /** True when a real next page exists beyond what this counts — the
   * sidebar badge shows "N+" rather than silently under-reporting (same
   * "documented limitation, not papered over" discipline as
   * lib/api/find-by-id.ts's page-capped scans). */
  hasMore: boolean;
}

export interface AttentionCounts {
  pendingApprovals: AttentionCount;
  openIncidents: AttentionCount;
}

/**
 * Sidebar attention counts (design-rework.md's Navigation section): a
 * real pending-approvals count and a real open-incidents count next to
 * those nav items, from the same list endpoints their own pages use —
 * no new backend counting endpoint. List responses are cursor-paginated
 * with no `total` field, so this counts the first page only (this
 * product's demo/foundation scale keeps that page's size — 50 — well
 * above what these two "needs attention" queues realistically hold);
 * `hasMore` covers the rare case a tenant genuinely has more than that.
 * `useApprovalsList`'s own PENDING polling (see its doc comment) keeps
 * this badge fresh without a separate interval here.
 */
export function useAttentionCounts(): AttentionCounts {
  const approvals = useApprovalsList({ status: "PENDING" });
  const incidents = useIncidentsList({ status: "OPEN" });

  const approvalsPage = approvals.data?.pages[0];
  const incidentsPage = incidents.data?.pages[0];

  return {
    pendingApprovals: {
      count: approvalsPage?.items.length ?? 0,
      hasMore: Boolean(approvalsPage?.nextCursor),
    },
    openIncidents: {
      count: incidentsPage?.items.length ?? 0,
      hasMore: Boolean(incidentsPage?.nextCursor),
    },
  };
}
