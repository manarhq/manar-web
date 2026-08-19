"use client";

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type SummarizeIncidentResult = components["schemas"]["SummarizeIncidentResponseDto"];

/**
 * `POST /incidents/summarize` (Phase 10c, design-rework.md's "Summarize
 * with AI" feature). Only `incidentId` is sent — `SummarizeIncidentRequestDto`
 * (manar-api/src/incidents/incidents.dto.ts) resolves the incident's
 * title/description and every AuditEvent matching its own
 * `relatedCorrelationIds` itself; the frontend never needs to (and
 * shouldn't) resolve or send those separately. Read-only: manar-api
 * never persists the result onto the `Incident` row, so this hook's
 * result only ever lives in the calling component's own state — there is
 * deliberately no cache invalidation of `["incidents", "detail", id]`
 * here, since nothing about the incident actually changed.
 *
 * `available: false` (with `result: null`) is a normal successful
 * response (manar-ai unreachable/timed out/circuit-open) — the caller
 * renders it as a calm "no AI response available" state, not an error.
 *
 * `retry: false` is deliberate, not just the TanStack Query mutation
 * default (which is already 0/no-retry, unlike queries' default of 3):
 * this call can legitimately take up to `AI_ADVISORY_LONGFORM_TIMEOUT_MS`
 * (30s default) on the manar-api side. Any retry here would both triple
 * the operator's wait and count as repeated failures against the
 * long-form circuit breaker (default threshold 3) on a single slow-but-
 * real request — see task-3-brief.md.
 */
export function useSummarizeIncident() {
  return useMutation({
    mutationFn: async (incidentId: string): Promise<SummarizeIncidentResult> => {
      const { data, error } = await apiClient.POST("/incidents/summarize", {
        body: { incidentId },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}
