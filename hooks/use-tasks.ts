"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { scanListForId, scanListForAll, normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type TaskStatus = components["schemas"]["TaskSummaryDto"]["status"];

/**
 * manar-api's `@ApiProperty({ nullable: true })` on `description` and
 * `parentTaskId` (no explicit `type`) makes `openapi-typescript` emit
 * `{} | null` instead of `string | null` — the same pattern
 * `normalizeCursorPage` works around for `nextCursor`. Re-typed here
 * once so every consumer gets the real runtime shape.
 */
export type TaskSummary = Omit<
  components["schemas"]["TaskSummaryDto"],
  "description" | "parentTaskId"
> & {
  description: string | null;
  parentTaskId: string | null;
};
export type CreateTaskRequest = components["schemas"]["CreateTaskRequestDto"];

export interface TasksListFilters {
  status?: TaskStatus;
  assignedAgentId?: string;
}

async function fetchTasksPage(
  filters: TasksListFilters,
  cursor: string | undefined,
): Promise<CursorPage<TaskSummary>> {
  const { data, error } = await apiClient.GET("/tasks", {
    params: {
      query: {
        status: filters.status,
        assignedAgentId: filters.assignedAgentId,
        cursor,
        limit: 50,
      },
    },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<TaskSummary>;
}

export function useTasksList(filters: TasksListFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["tasks", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchTasksPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** No `GET /tasks/:id` exists — resolved by paging `GET /tasks`, same
 * constraint as agents (see lib/api/find-by-id.ts). */
export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: () => scanListForId<TaskSummary>((cursor) => fetchTasksPage({}, cursor), id),
    enabled: Boolean(id),
  });
}

/**
 * A simple delegation-chain display (Section 65's "if reasonably
 * simple"): `GET /tasks` has no `parentTaskId` filter, so the parent (a
 * single scan-for-id) and children (a full scan-and-collect, capped like
 * every other list-scan here) are both derived client-side from the same
 * list endpoint — the only real data source, not fabricated hierarchy.
 */
export function useTaskDelegationChain(task: TaskSummary | null | undefined) {
  const parentId = task?.parentTaskId ?? null;

  const parent = useQuery({
    queryKey: ["tasks", "detail", parentId],
    queryFn: () =>
      scanListForId<TaskSummary>((cursor) => fetchTasksPage({}, cursor), parentId as string),
    enabled: Boolean(parentId),
  });

  const children = useQuery({
    queryKey: ["tasks", "children", task?.id],
    queryFn: () =>
      scanListForAll<TaskSummary>(
        (cursor) => fetchTasksPage({}, cursor),
        (item) => item.parentTaskId === task?.id,
      ),
    enabled: Boolean(task?.id),
  });

  return { parent: parentId ? parent : null, children };
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTaskRequest) => {
      const { data, error } = await apiClient.POST("/tasks", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
    },
  });
}

export function useRevokeTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await apiClient.POST("/tasks/{id}/revoke", {
        params: { path: { id } },
        body: { reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "children"] });
    },
  });
}
