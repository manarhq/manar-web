"use client";

import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage, scanListForAll } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

/** Same `{} | null` -> real-type normalization as every other resource's
 * nullable field (manar-api's `@ApiProperty({ nullable: true })` without
 * an explicit `type` — see hooks/use-tasks.ts). */
export type AuditEvent = Omit<
  components["schemas"]["AuditEventSearchResultDto"],
  "previousHash"
> & {
  previousHash: string | null;
};

export interface AuditFilters {
  eventType?: string;
  correlationId?: string;
  agentId?: string;
  taskId?: string;
  toolId?: string;
  actionId?: string;
  decision?: string;
  riskMin?: number;
  riskMax?: number;
  from?: string;
  to?: string;
}

async function fetchAuditPage(
  filters: AuditFilters,
  cursor: string | undefined,
): Promise<CursorPage<AuditEvent>> {
  const { data, error } = await apiClient.GET("/audit", {
    params: {
      query: {
        eventType: filters.eventType || undefined,
        correlationId: filters.correlationId || undefined,
        agentId: filters.agentId || undefined,
        taskId: filters.taskId || undefined,
        toolId: filters.toolId || undefined,
        actionId: filters.actionId || undefined,
        decision: filters.decision || undefined,
        riskMin: filters.riskMin,
        riskMax: filters.riskMax,
        from: filters.from || undefined,
        to: filters.to || undefined,
        cursor,
        limit: 50,
      },
    },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<AuditEvent>;
}

export function useAuditSearch(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ["audit", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchAuditPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * No `GET /audit/:id` exists — `GET /audit`'s filter set has nothing to
 * search by event id either, so (unlike every other resource's
 * find-by-id scan) this pages through the *unfiltered* search with no
 * server-side narrowing at all. Capped the same way as every other
 * scan; a very old event past the page cap genuinely won't resolve here
 * — documented as a real limitation, not silently papered over.
 */
export function useAuditEventDetail(eventId: string) {
  return useQuery({
    queryKey: ["audit", "detail", eventId],
    queryFn: async () => {
      const matches = await scanListForAll<AuditEvent>(
        (cursor) => fetchAuditPage({}, cursor),
        (item) => item.eventId === eventId,
        40,
      );
      return matches[0] ?? null;
    },
    enabled: Boolean(eventId),
  });
}

/** The "decision timeline" for an event's detail page: every other event
 * sharing its correlationId, which GET /audit *does* support filtering
 * on server-side — a real, bounded query, not a further client scan. */
export function useCorrelatedEvents(correlationId: string | undefined) {
  return useQuery({
    queryKey: ["audit", "correlated", correlationId],
    queryFn: async () => {
      const page = await fetchAuditPage({ correlationId }, undefined);
      return page.items.slice().sort((a, b) => a.sequence - b.sequence);
    },
    enabled: Boolean(correlationId),
  });
}

export function useAuditVerifyChain() {
  return useQuery({
    queryKey: ["audit", "verify"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/audit/verify");
      if (error) throw error;
      return data;
    },
  });
}

export type EvidenceExportRequest = components["schemas"]["EvidenceExportRequestDto"];

export function useEvidenceExport() {
  return useMutation({
    mutationFn: async (body: EvidenceExportRequest) => {
      const { data, error } = await apiClient.POST("/evidence/export", { body });
      if (error) throw error;
      return data;
    },
  });
}

export type EvidenceVerifyResult = { valid: true } | { valid: false; reason: string };

/** `POST /evidence/verify`: manar-api checks the bundle hash and the HS256
 * signature with the deployment's key (no offline public-key check yet). */
export function useEvidenceVerify() {
  return useMutation({
    mutationFn: async (input: { bundle: unknown; signature: string }) => {
      // The OpenAPI document does not declare this body or response schema.
      const { data, error } = await apiClient.POST("/evidence/verify", {
        body: input,
      } as never);
      if (error) throw error;
      return data as unknown as EvidenceVerifyResult;
    },
  });
}
