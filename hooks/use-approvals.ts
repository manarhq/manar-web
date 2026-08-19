"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage, scanListForId } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type ApprovalStatus = components["schemas"]["ApprovalRequestSummaryDto"]["status"];
export type ApprovalDecision = components["schemas"]["DecideApprovalRequestDto"]["decision"];

/** Same `{} | null` -> real-type normalization as tasks' description/
 * parentTaskId (manar-api's `@ApiProperty({ nullable: true })` without
 * an explicit `type`). */
export type ApprovalSummary = Omit<
  components["schemas"]["ApprovalRequestSummaryDto"],
  "policyVersionId"
> & {
  policyVersionId: string | null;
};

export interface ApprovalsListFilters {
  status?: ApprovalStatus;
}

async function fetchApprovalsPage(
  filters: ApprovalsListFilters,
  cursor: string | undefined,
): Promise<CursorPage<ApprovalSummary>> {
  const { data, error } = await apiClient.GET("/approvals", {
    params: { query: { status: filters.status, cursor, limit: 50 } },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<ApprovalSummary>;
}

export function useApprovalsList(filters: ApprovalsListFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["approvals", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchApprovalsPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Approvals can resolve asynchronously out from under this list (the
    // decide endpoint only signals a Temporal workflow and returns
    // immediately — see useDecideApproval's doc comment) — poll gently
    // while anything on the current page is still PENDING so the badge
    // updates without a manual refresh.
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const anyPending = pages.some((page) => page.items.some((item) => item.status === "PENDING"));
      return anyPending ? 3000 : false;
    },
  });
}

/** No `GET /approvals/:id` exists on the human-facing side (only the
 * mTLS agent-facing `GET /agent/v1/approvals/:id`, unreachable from this
 * console) — resolved by paging `GET /approvals`. */
export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: ["approvals", "detail", id],
    queryFn: () => scanListForId<ApprovalSummary>((cursor) => fetchApprovalsPage({}, cursor), id),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2000 : false),
  });
}

export interface DecideApprovalResult {
  status: "decided" | "already-decided";
  currentStatus?: ApprovalStatus;
}

/**
 * `POST /approvals/:id/decide` — Section 65's explicit race-safety
 * requirement. manar-api itself is the real source of truth here: the
 * controller re-reads the ApprovalRequest row immediately before
 * signaling its Temporal workflow and returns `409 Conflict` if it's no
 * longer PENDING (already decided by another tab/approver, or expired).
 * This hook turns that into a typed, non-throwing result rather than a
 * raw error the caller has to string-match, so the UI can show "someone
 * else already decided this" instead of a generic failure. The button
 * itself is disabled the instant `isPending` flips true — see
 * ApprovalDecideButtons — which is the frontend half of "two rapid
 * clicks must not double-decide" (manar-api's 409 is the half that
 * actually enforces it under a real race).
 */
export function useDecideApproval(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decision: ApprovalDecision;
      reason?: string;
    }): Promise<DecideApprovalResult> => {
      const { error, response } = await apiClient.POST("/approvals/{id}/decide", {
        params: { path: { id } },
        body: input,
      });
      if (error) {
        if (response.status === 409) {
          return { status: "already-decided" };
        }
        throw error;
      }
      return { status: "decided" };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", "detail", id] });
    },
  });
}
