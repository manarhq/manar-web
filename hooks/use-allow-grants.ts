"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

/** Where a permission came from: an 8-hour approval, "always allow this here" offered after three
 * approvals, or accepted from what Manar saw while a new device learned. */
export type GrantOrigin = "approval" | "offer" | "learning";

export interface AllowGrant {
  id: string;
  origin: GrantOrigin;
  hostId: string | null;
  hostName: string | null;
  toolId: string;
  actionId: string;
  /** The exact resource of an 8-hour grant, or the folder / site an always-allow covers. */
  scope: string;
  createdAt: string;
  expiresAt: string;
  useCount: number;
}

/** `GET /approvals/allow-grants`: every live permission that skips the prompt (approvers only), a
 * page at a time (newest first). */
export function useAllowGrants() {
  const q = useInfiniteQuery({
    queryKey: ["allow-grants"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      bffJson<{ items: AllowGrant[]; nextCursor?: string | null }>(
        `/approvals/allow-grants${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    // Grants are security state: always read fresh, never served from a timer.
    staleTime: 0,
  });
  return {
    data: q.data?.pages.flatMap((p) => p.items),
    error: q.error,
    isError: q.isError,
    isLoading: q.isLoading,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    fetchNextPage: q.fetchNextPage,
  };
}

/** Withdrawing only ever adds protection, but the row stays until the server has said yes. */
export function useWithdrawGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      bffJson<{ id: string }>(`/approvals/allow-grants/${encodeURIComponent(id)}/revoke`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allow-grants"] }),
  });
}
