"use client";

import { useApprovalsList } from "@/hooks/use-approvals";

/** Pending approvals, from the same list the Approvals page uses. `unavailable` means the count
 * is unknown, not zero. Counts the first page only (50); `hasMore` says there are more. */
export function usePendingApprovals() {
  const query = useApprovalsList({ status: "PENDING" });
  const page = query.data?.pages[0];
  return {
    items: page?.items ?? [],
    count: page?.items.length ?? 0,
    hasMore: Boolean(page?.nextCursor),
    isLoading: query.isLoading,
    unavailable: query.isError,
  };
}
