"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AuditVerifyResult } from "@/lib/audit-verify";

/**
 * `GET /audit/verify` through the generated client + TanStack Query — a
 * real authenticated, tenant-scoped round trip to manar-api. This is the
 * "typed client + TanStack Query -> real backend data" half of
 * /overview's proof-of-life (see hooks/use-live-event-count.ts for the
 * other half, the SSE-driven live counter).
 */
export function useAuditVerify() {
  return useQuery({
    queryKey: ["audit", "verify"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/audit/verify");
      if (error) throw error;
      return data as AuditVerifyResult;
    },
    refetchInterval: AUDIT_VERIFY_INTERVAL_MS,
  });
}

/** The check was a full chain walk every 30 s; it now runs every 5 minutes (perf decision 17). */
export const AUDIT_VERIFY_INTERVAL_MS = 5 * 60_000;
