"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { ListQueryOptions } from "@/lib/api/list-query-options";
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
export function useToolsList(filters: ToolsListFilters = {}, options: ListQueryOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["tools", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchToolsPage(filters, pageParam),
    enabled: options.enabled,
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

type ToolActionMatch = { tool: ToolSummary; action: ToolActionSummary };
const AMBIGUOUS = "ambiguous" as const;

function index(
  tools: readonly ToolSummary[],
  key: (tool: ToolSummary, action: ToolActionSummary) => string,
) {
  const map = new Map<string, ToolActionMatch | typeof AMBIGUOUS>();
  for (const tool of tools) {
    for (const action of tool.actions) {
      const k = key(tool, action);
      const prev = map.get(k);
      // Two (tool, action) pairs under one key: never pick one.
      map.set(
        k,
        prev && (prev === AMBIGUOUS || prev.action.id !== action.id) ? AMBIGUOUS : { tool, action },
      );
    }
  }
  return map;
}

/**
 * Resolves an approval's `(toolId, actionId)` to a registry action, matching
 * ID with ID or name with name, never across. manar-api currently stores the
 * tool and action *names* in those fields, so `GET /approvals/:id` returns
 * `expectedEffect: null`. Returns `undefined` (unknown) when nothing matches,
 * when a key matches more than one action, or when the ID and name matches
 * disagree. This is the registry's current definition, not what was
 * recorded with the request; callers must say so.
 */
export function buildToolActionLookup(tools: readonly ToolSummary[]) {
  const byId = index(tools, (tool, action) => `${tool.id}\u0000${action.id}`);
  const byName = index(tools, (tool, action) => `${tool.name}\u0000${action.name}`);
  return (toolId: string, actionId: string): ToolActionMatch | undefined => {
    const k = `${toolId}\u0000${actionId}`;
    const id = byId.get(k);
    const name = byName.get(k);
    if (id === AMBIGUOUS || name === AMBIGUOUS) return undefined;
    if (id && name && id.action.id !== name.action.id) return undefined;
    return id ?? name;
  };
}

/** `buildToolActionLookup` over the one picker page; an action beyond it is unknown. */
export function useToolActionLookup() {
  const query = useAllToolsForPicker();
  return useMemo(() => buildToolActionLookup(query.data ?? []), [query.data]);
}
