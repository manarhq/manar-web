"use client";

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { AuditFilters } from "@/hooks/use-audit";

export type InvestigateAuditResult = components["schemas"]["InvestigateAuditResponseDto"];

/**
 * `POST /audit/investigate` (Phase 10c, design-rework.md's "Ask a
 * question" feature). Reuses the audit page's own already-active filter
 * state as the query scope — `AuditController.investigateAudit` accepts
 * exactly `GET /audit`'s filter set (`InvestigateAuditRequestDto`, read
 * from `manar-api/src/audit/audit.dto.ts`), plus `question`. manar-api
 * performs its own tenant-scoped retrieval using those filters and passes
 * only the results to manar-ai as context — this hook never sends more
 * than the same filter shape the list view already exposes.
 *
 * `available: false` (with `result: null`) means manar-ai was
 * unreachable/timed out/circuit-open — a normal, expected outcome this
 * hook surfaces as real mutation *success* (not an error), so the caller
 * renders it as a calm "no AI response available" state rather than an
 * error banner. An actual thrown `error` here means the HTTP call itself
 * failed (auth/validation/5xx).
 *
 * `retry: false` is deliberate, not just the TanStack Query mutation
 * default (which is already 0/no-retry, unlike queries' default of 3):
 * this call can legitimately take up to `AI_ADVISORY_LONGFORM_TIMEOUT_MS`
 * (30s default) on the manar-api side. Any retry here would both triple
 * the operator's wait and count as repeated failures against the
 * long-form circuit breaker (default threshold 3) on a single slow-but-
 * real request — see task-3-brief.md.
 */
export function useInvestigateAudit() {
  return useMutation({
    mutationFn: async (input: {
      question: string;
      filters: AuditFilters;
    }): Promise<InvestigateAuditResult> => {
      const { filters } = input;
      const { data, error } = await apiClient.POST("/audit/investigate", {
        body: {
          question: input.question,
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
        },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}
