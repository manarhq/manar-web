"use client";

import { useMemo } from "react";

import { useApprovalsList } from "@/hooks/use-approvals";
import { useHeldIds, type QueueApproval } from "@/hooks/use-answer-approval";
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
    highRisk: item.highRisk,
    hostName: item.hostName,
    ownerName: item.ownerName,
    allowedDecisions: item.allowedDecisions,
    needs: item.needs,
    why: item.why,
  };
}

/** Pending approvals, agent tasks and devices together, oldest first. `unavailable` means the
 * count is unknown, not zero. Counts the first page only (50); `hasMore` says there are more.
 * A failing device-approvals call is not an outage: older tenants have none. */
export function usePendingApprovals() {
  const query = useApprovalsList({ status: "PENDING" });
  const host = useHostApprovals();
  const page = query.data?.pages[0];
  // A decision held for Undo is out of the queue (the next request can be read) until it is
  // sent or undone.
  const held = useHeldIds();
  const items = useMemo<QueueApproval[]>(
    () =>
      [
        ...((page?.items ?? []) as QueueApproval[]),
        ...(host.data ?? []).map(hostApprovalAsQueueItem),
      ]
        .filter((i) => !held.has(i.id))
        .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
    [page, host.data, held],
  );
  return {
    items,
    count: items.length,
    hasMore: Boolean(page?.nextCursor),
    isLoading: query.isLoading,
    unavailable: query.isError,
  };
}
