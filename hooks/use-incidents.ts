"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ListQueryOptions } from "@/lib/api/list-query-options";
import { liveQueryOptions } from "@/lib/api/live-query";
import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";
import type { AuditEvent } from "@/hooks/use-audit";

export type IncidentSeverity = components["schemas"]["IncidentSummaryDto"]["severity"];
export type IncidentStatus = components["schemas"]["IncidentSummaryDto"]["status"];

/** Same `{} | null` -> real-type normalization as every other resource's
 * nullable field (manar-api's `@ApiProperty({ nullable: true })` without
 * an explicit `type` — see hooks/use-tasks.ts). */
export type Incident = Omit<components["schemas"]["IncidentSummaryDto"], "resolvedAt"> & {
  resolvedAt: string | null;
};
export type CreateIncidentRequest = components["schemas"]["CreateIncidentRequestDto"];
export type UpdateIncidentRequest = components["schemas"]["UpdateIncidentRequestDto"];

export interface IncidentsListFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
}

async function fetchIncidentsPage(
  filters: IncidentsListFilters,
  cursor: string | undefined,
): Promise<CursorPage<Incident>> {
  const { data, error } = await apiClient.GET("/incidents", {
    params: { query: { status: filters.status, severity: filters.severity, cursor, limit: 50 } },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<Incident>;
}

export function useIncidentsList(
  filters: IncidentsListFilters = {},
  options: ListQueryOptions = {},
) {
  return useInfiniteQuery({
    queryKey: ["incidents", "list", filters],
    ...liveQueryOptions,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchIncidentsPage(filters, pageParam),
    enabled: options.enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** Unlike agents/tasks/tools/approvals, Incident has a real `GET
 * /incidents/:id` (Phase 15a) — no list-scan needed here. */
export function useIncidentDetail(id: string) {
  return useQuery({
    queryKey: ["incidents", "detail", id],
    ...liveQueryOptions,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/incidents/{id}", { params: { path: { id } } });
      if (error) throw error;
      return data as Incident;
    },
    enabled: Boolean(id),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateIncidentRequest) => {
      const { data, error } = await apiClient.POST("/incidents", { body });
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents", "list"] });
    },
  });
}

export function useUpdateIncident(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateIncidentRequest) => {
      const { data, error } = await apiClient.PATCH("/incidents/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents", "list"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", "detail", id] });
    },
  });
}

/**
 * An incident's real "here's what happened" context (Phase 15b): every
 * audit event sharing any of `relatedCorrelationIds`, pulled via the same
 * `GET /audit?correlationId=...` endpoint and query shape
 * `useCorrelatedEvents` (hooks/use-audit.ts) uses for one correlation ID —
 * the two hooks intentionally share the exact same query key/fetch shape
 * per correlation ID so navigating between an incident and the audit page
 * reuses the same cached page rather than re-fetching. An incident can
 * reference more than one correlation ID, so this fans out with
 * `useQueries` (dynamic count, can't be a fixed sequence of hook calls)
 * and merges the results into one deduplicated, sequence-ordered list.
 */
export function useIncidentAuditTrail(correlationIds: string[]) {
  const results = useQueries({
    queries: correlationIds.map((correlationId) => ({
      queryKey: ["audit", "correlated", correlationId],
      queryFn: async () => {
        const { data, error } = await apiClient.GET("/audit", {
          params: { query: { correlationId, limit: 50 } },
        });
        if (error) throw error;
        const page = normalizeCursorPage(data) as unknown as CursorPage<AuditEvent>;
        return page.items.slice().sort((a, b) => a.sequence - b.sequence);
      },
      enabled: Boolean(correlationId),
    })),
  });

  const isPending = correlationIds.length > 0 && results.some((r) => r.isPending);
  const isError = results.some((r) => r.isError);
  const byId = new Map<string, AuditEvent>();
  for (const result of results) {
    for (const event of result.data ?? []) {
      byId.set(event.eventId, event);
    }
  }
  const events = Array.from(byId.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return { isPending, isError, data: events };
}
