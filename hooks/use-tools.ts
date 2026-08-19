"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage, scanListForId } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type ToolSummary = components["schemas"]["ToolSummaryDto"];
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
  return normalizeCursorPage(data);
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
