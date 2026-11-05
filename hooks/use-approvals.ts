"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { liveQueryOptions } from "@/lib/api/live-query";
import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type ApprovalStatus = components["schemas"]["ApprovalRequestSummaryDto"]["status"];
export type ApprovalDecision = components["schemas"]["DecideApprovalRequestDto"]["decision"];

/** What the console sends. `approve_8h` also creates an 8-hour allow for this exact action;
 * `approve_always` is for a new site only (JAIL) and needs the owner. */
export type ApprovalChoice = "approve_once" | "approve_8h" | "approve_always" | "deny";

/** "Approve + make rule": an ALLOW rule pre-filled from the request, for the rule editor. */
export interface RuleDraft {
  name?: string;
  toolId: string;
  actionId: string;
  resourcePattern: string;
  effect: "ALLOW";
  description?: string;
}

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
    ...liveQueryOptions,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchApprovalsPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // A request can still resolve out from under this list even after
    // Phase 14's security cleanup 1 (decide() synchronously awaiting the
    // real outcome only tells *that caller's own tab* the truth
    // immediately — a decision made from a different tab/approver/session
    // still only reaches this list on its own next fetch) — poll gently
    // while anything on the current page is still PENDING so the badge
    // updates without a manual refresh. See useDecideApproval's doc
    // comment for what changed in the decide endpoint itself.
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const anyPending = pages.some((page) => page.items.some((item) => item.status === "PENDING"));
      return anyPending ? 3000 : false;
    },
  });
}

export type ApprovalDetail = components["schemas"]["ApprovalRequestDetailDto"];

/**
 * `GET /approvals/:id` — the exact action under review.
 *
 * This used to scan `GET /approvals` page by page for a matching id,
 * because no human-facing single-resource endpoint existed (only the
 * mTLS agent-facing `GET /agent/v1/approvals/:id`, unreachable from this
 * app). It now calls the real endpoint, which matters for more than
 * efficiency: the list DTO never carried the invocation parameters or the
 * risk breakdown, so the card could only ever show a score and say so.
 *
 * The detail response is what a reviewer actually needs before binding a
 * grant: the redacted parameters, the `parameterDigest` that grant is
 * bound to, the risk factors split into deterministic and AI-attributed
 * codes, why approval was required, and what the action does.
 */
export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: ["approvals", "detail", id],
    ...liveQueryOptions,
    queryFn: async (): Promise<ApprovalDetail> => {
      const { data, error } = await apiClient.GET("/approvals/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as ApprovalDetail;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2000 : false),
  });
}

export type DecideOutcomeStatus = "APPROVED" | "DENIED" | "EXPIRED";

export type DecideApprovalResult =
  | { status: "already-decided" }
  /** manar-api's real, resolved outcome (Phase 14 security cleanup 1 —
   * see this hook's doc comment) — `outcomeStatus`/`outcomeDecision` are
   * what actually took effect, which is not necessarily the caller's own
   * `submittedDecision` if a genuinely concurrent decide won the race. */
  | {
      status: "decided";
      outcomeStatus: DecideOutcomeStatus;
      outcomeDecision?: ApprovalDecision;
      submittedDecision: ApprovalDecision | ApprovalChoice;
      grantId?: string;
      ruleDraft?: RuleDraft | null;
    };

/**
 * `POST /approvals/:id/decide` — Section 65's explicit race-safety
 * requirement. manar-api itself is the real source of truth here in two
 * layers:
 *  - The controller re-reads the ApprovalRequest row immediately before
 *    signaling its Temporal workflow and returns `409 Conflict` if it's
 *    no longer PENDING (already decided by another tab/approver, or
 *    expired) — that pre-check race window still exists, so `409` is
 *    still turned into a typed `"already-decided"` result here rather
 *    than a raw error.
 *  - As of Phase 14 security cleanup 1, the endpoint additionally
 *    **synchronously awaits** `ApprovalWorkflow`'s real terminal outcome
 *    before responding (replacing the old "signal and return
 *    immediately" behavior) — so a `2xx` response here carries the
 *    actual, final `status`/`decision`, not an echo of what was
 *    submitted. Two genuinely concurrent decide calls that both pass the
 *    pre-check (both get signaled, both `2xx`) now both observe the same
 *    real outcome, which may differ from what either caller submitted —
 *    `ApprovalDecideButtons` surfaces that explicitly rather than
 *    assuming its own submission won.
 * The button itself is disabled the instant `isPending` flips true — the
 * frontend half of "two rapid clicks must not double-decide" (manar-api's
 * `409`/synchronous-outcome behavior is the half that actually enforces
 * it under a real race).
 */
export function useDecideApproval(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decision: ApprovalDecision | ApprovalChoice;
      reason?: string;
      makeRule?: boolean;
    }): Promise<DecideApprovalResult> => {
      const { data, error, response } = await apiClient.POST("/approvals/{id}/decide", {
        params: { path: { id } },
        // The generated types predate approve_once / approve_8h / makeRule (regenerate with
        // `pnpm api:codegen` once manar-api's approvals branch is merged).
        body: input as never,
      });
      if (error) {
        if (response.status === 409) {
          return { status: "already-decided" };
        }
        throw error;
      }
      return {
        status: "decided",
        outcomeStatus: data.status,
        outcomeDecision: data.decision,
        submittedDecision: input.decision,
        grantId: (data as { grantId?: string }).grantId,
        ruleDraft: (data as { ruleDraft?: RuleDraft | null }).ruleDraft,
      };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", "detail", id] });
    },
  });
}
