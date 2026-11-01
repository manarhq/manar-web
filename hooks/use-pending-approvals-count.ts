"use client";

import { useMemo } from "react";

import { useApprovalsList } from "@/hooks/use-approvals";
import type { QueueApproval } from "@/hooks/use-answer-approval";
import { useHostApprovals, type HostApprovalItem } from "@/hooks/use-host-approvals";

/** A device approval in the shape the queue and the Home card share. The risk score of a device
 * approval is not recorded, so it is 0 here and `kind: "host"` tells views not to show it. */
export function hostApprovalAsQueueItem(item: HostApprovalItem): QueueApproval {
  return {
    id: item.id,
    taskId: "",
    agentId: item.hostId,
    toolId: item.toolId,
    actionId: item.actionId,
    resource: item.resource,
    riskScore: 0,
    policyVersionId: null,
    status: "PENDING",
    requestedAt: item.createdAt,
    expiresAt: item.expiresAt,
    kind: "host",
    explanation: item.explanation,
  };
}

/** Pending approvals, agent tasks and devices together, oldest first. `unavailable` means the
 * count is unknown, not zero. Counts the first page only (50); `hasMore` says there are more.
 * A failing device-approvals call is not an outage: older tenants have none. */
export function usePendingApprovals() {
  const query = useApprovalsList({ status: "PENDING" });
  const host = useHostApprovals();
  const page = query.data?.pages[0];
  const items = useMemo<QueueApproval[]>(
    () =>
      [...(page?.items ?? []), ...(host.data ?? []).map(hostApprovalAsQueueItem)].sort((a, b) =>
        a.requestedAt.localeCompare(b.requestedAt),
      ),
    [page, host.data],
  );
  return {
    items,
    count: items.length,
    hasMore: Boolean(page?.nextCursor),
    isLoading: query.isLoading,
    unavailable: query.isError,
  };
}
