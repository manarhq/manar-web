"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListQueryOptions } from "@/lib/api/list-query-options";
import { apiClient } from "@/lib/api/client";
import { scanListForId, normalizeCursorPage, type CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type AgentStatus = components["schemas"]["AgentSummaryDto"]["status"];
export type AgentSummary = components["schemas"]["AgentSummaryDto"];

export interface AgentsListFilters {
  status?: AgentStatus;
}

/** `GET /agents` — cursor-paginated (Phase 11b Part 1's convention, see
 * lib/api/find-by-id.ts's doc comment), consumed as a TanStack Query
 * infinite query: `fetchNextPage()` drives a "Load more" affordance
 * rather than classic offset pagination. */
export function useAgentsList(filters: AgentsListFilters = {}, options: ListQueryOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["agents", "list", filters],
    queryFn: async ({
      pageParam,
    }: {
      pageParam: string | undefined;
    }): Promise<CursorPage<AgentSummary>> => {
      const { data, error } = await apiClient.GET("/agents", {
        params: { query: { status: filters.status, cursor: pageParam, limit: 50 } },
      });
      if (error) throw error;
      return normalizeCursorPage(data);
    },
    enabled: options.enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** No `GET /agents/:id` exists (see lib/api/find-by-id.ts) — this scans
 * `GET /agents` for a matching id. */
export function useAgentDetail(id: string) {
  return useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () =>
      scanListForId<AgentSummary>(async (cursor) => {
        const { data, error } = await apiClient.GET("/agents", {
          params: { query: { cursor, limit: 100 } },
        });
        if (error) throw error;
        return normalizeCursorPage(data);
      }, id),
    enabled: Boolean(id),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["CreateAgentRequestDto"]) => {
      const { data, error } = await apiClient.POST("/agents", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] });
    },
  });
}

export function useRevokeAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await apiClient.POST("/agents/{id}/revoke", {
        params: { path: { id } },
        body: { reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] });
      queryClient.invalidateQueries({ queryKey: ["agents", "detail", id] });
    },
  });
}

/** Issues a one-time enrollment token (`POST /agents/:id/enrollment-tokens`).
 * Deliberately not cached by TanStack Query as a `useQuery` — this is a
 * mutation precisely because the raw token must never be retrievable a
 * second time (Section 34's "displays the raw token once, never again").
 * The response only ever lives in the calling component's own React
 * state, cleared when its dialog closes. */
export function useCreateEnrollmentToken(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST("/agents/{id}/enrollment-tokens", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Enrollment transitions PENDING_ENROLLMENT -> ACTIVE only once the
      // agent actually calls POST /agents/enroll with the token, which
      // this console never does — but refresh anyway in case a
      // concurrent enrollment happened between page load and this click.
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] });
      queryClient.invalidateQueries({ queryKey: ["agents", "detail", id] });
    },
  });
}

/** `targetId` normalized from the generator's `{} | null` (nullable uuid). */
type KillSwitchSummary = Omit<components["schemas"]["KillSwitchSummaryDto"], "targetId"> & {
  targetId: string | null;
};

/**
 * Finds this agent's active kill switch by following `GET /kill-switches`
 * cursors until it is found or the list is exhausted. `null` means "no
 * active switch for this agent" only after every page was read. A failed
 * page, a repeated cursor or too many pages throw, so the caller shows an
 * unknown state instead of "off" (fail closed).
 */
export async function findActiveAgentKillSwitch(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<KillSwitchSummary>>,
  agentId: string,
  maxPages = 100,
): Promise<KillSwitchSummary | null> {
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const { items, nextCursor } = await fetchPage(cursor);
    const match = items.find((k) => k.targetId === agentId);
    if (match) return match;
    if (!nextCursor) return null;
    if (seen.has(nextCursor)) throw new Error("kill-switch list returned a repeated cursor");
    seen.add(nextCursor);
    cursor = nextCursor;
  }
  throw new Error(`kill-switch list not exhausted after ${maxPages} pages`);
}

/** The agent's kill switch: `GET /kill-switches?scope=AGENT&active=true`, every page, filtered to this agent. */
export function useAgentKillSwitch(id: string) {
  return useQuery({
    queryKey: ["agents", "kill-switch", id],
    queryFn: () =>
      findActiveAgentKillSwitch(async (cursor) => {
        const { data, error } = await apiClient.GET("/kill-switches", {
          params: { query: { scope: "AGENT", active: true, limit: 100, cursor } },
        });
        if (error) throw error;
        return normalizeCursorPage(data) as unknown as CursorPage<KillSwitchSummary>;
      }, id),
    refetchInterval: 5000,
  });
}

/** Activates (`POST /agents/:id/kill-switch`) or releases (`.../deactivate`) the agent's kill switch. */
export function useSetAgentKillSwitch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { active: boolean; reason?: string }) => {
      const { error } = input.active
        ? await apiClient.POST("/agents/{id}/kill-switch", {
            params: { path: { id } },
            body: { reason: input.reason },
          })
        : await apiClient.POST("/agents/{id}/kill-switch/deactivate", { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", "kill-switch", id] });
    },
  });
}
