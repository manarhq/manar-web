"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

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
      return data;
    },
    refetchInterval: 30_000,
  });
}
