"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage, scanListForId } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

/** Same `{} | null` -> real-type normalization as tasks' description
 * (manar-api's `@ApiProperty({ nullable: true })` without an explicit
 * `type` — see hooks/use-tasks.ts). */
export type ToolSummary = Omit<
  components["schemas"]["ToolSummaryDto"],
  "vendor" | "description"
> & {
  vendor: string | null;
  description: string | null;
};
export type ToolActionSummary = components["schemas"]["ToolActionSummaryDto"];

export interface ToolsListFilters {
  enabled?: boolean;
}

async function fetchToolsPage(
  filters: ToolsListFilters,
  cursor: string | undefined,
): Promise<CursorPage<ToolSummary>> {
  const { data, error } = await apiClient.GET("/tools", {
    params: { query: { enabled: filters.enabled, cursor, limit: 50 } },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<ToolSummary>;
}

/** manar-api's tool registry is deliberately read-only from this
 * console (Section 7b: no `POST`/`PUT /tools`, no per-tool action beyond
 * the kill-switch — out of this phase's scope) — every hook here is a
 * `GET`. */
export function useToolsList(filters: ToolsListFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["tools", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchToolsPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** All tools in one page for pickers (task grant builder) — the
 * registry is small by construction (curated, not user-created), so a
 * single generous page is realistic rather than needing "load more". */
export function useAllToolsForPicker() {
  return useQuery({
    queryKey: ["tools", "picker"],
    queryFn: () => fetchToolsPage({}, undefined),
    select: (page) => page.items,
  });
}

/** No `GET /tools/:id` exists — resolved by paging `GET /tools`. */
export function useToolDetail(id: string) {
  return useQuery({
    queryKey: ["tools", "detail", id],
    queryFn: () => scanListForId<ToolSummary>((cursor) => fetchToolsPage({}, cursor), id),
    enabled: Boolean(id),
  });
}

/**
 * Resolves an approval's `(toolId, actionId)` to its registry action. Matches
 * by ID or by name: manar-api currently stores the tool and action *names* in
 * those fields, so `GET /approvals/:id` returns `expectedEffect: null` for
 * them. Uses the one picker page, so an action beyond it resolves to
 * `undefined` (shown as unknown), never to a guess.
 */
export function useToolActionLookup() {
  const query = useAllToolsForPicker();
  return useMemo(() => {
    const byKey = new Map<string, { tool: ToolSummary; action: ToolActionSummary }>();
    for (const tool of query.data ?? []) {
      for (const action of tool.actions) {
        for (const toolKey of [tool.id, tool.name]) {
          for (const actionKey of [action.id, action.name]) {
            byKey.set(`${toolKey}\u0000${actionKey}`, { tool, action });
          }
        }
      }
    }
    return (toolId: string, actionId: string) => byKey.get(`${toolId}\u0000${actionId}`);
  }, [query.data]);
}
