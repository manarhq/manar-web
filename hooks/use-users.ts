"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage, scanListForId } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";
import type { RoleName } from "@/lib/roles";

export type UserSummary = components["schemas"]["UserSummaryDto"];
export type RoleBinding = components["schemas"]["RoleBindingDto"];

async function fetchUsersPage(cursor: string | undefined): Promise<CursorPage<UserSummary>> {
  const { data, error } = await apiClient.GET("/users", {
    params: { query: { cursor, limit: 50 } },
  });
  if (error) throw error;
  return normalizeCursorPage(data);
}

/** `GET /users` — cursor-paginated, any authenticated tenant user may call
 * this (UsersController's doc comment: role badges aren't sensitive
 * within a tenant). */
export function useUsersList() {
  return useInfiniteQuery({
    queryKey: ["users", "list"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchUsersPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** No dedicated detail route in this phase's scope — kept for parity with
 * the other resources' `find-by-id` scan pattern in case a future phase
 * adds a `/users/:id` page. */
export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => scanListForId<UserSummary>(fetchUsersPage, id),
    enabled: Boolean(id),
  });
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["users"] });
}

/**
 * `POST /users/:id/role-bindings` — grants `role` to user `id`. Gated
 * server-side to `TENANT_OWNER`/`SECURITY_ADMIN` plus the
 * privilege-escalation guard (`lib/roles.ts`'s `canGrantRole` mirrors it
 * client-side as a UX nicety only — see that file's doc comment). manar-api
 * is the real authority: a 403 here means the guard rejected it
 * server-side regardless of what the UI offered.
 */
export function useGrantRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: RoleName) => {
      const { data, error } = await apiClient.POST("/users/{id}/role-bindings", {
        params: { path: { id: userId } },
        body: { role },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** `DELETE /users/:id/role-bindings/:role` — revokes `role` from user
 * `id`. Same gate/guard as grant, applied to revoke (Phase 14 fixed the
 * guard to cover revoke, not just grant — see manar-api's
 * `717a4ac`/`UsersController.revokeRole`). Idempotent server-side. */
export function useRevokeRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: RoleName) => {
      const { data, error } = await apiClient.DELETE("/users/{id}/role-bindings/{role}", {
        params: { path: { id: userId, role } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateUsers(queryClient),
  });
}
