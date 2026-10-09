"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Dto = components["schemas"]["AgentQuarantineDto"];

/** `AgentQuarantineDto` with the generator's `{} | null` nullable fields normalized. */
export type AgentQuarantine = Omit<
  Dto,
  | "detector"
  | "explanationEn"
  | "explanationAr"
  | "decisionId"
  | "releasedBy"
  | "releasedAt"
  | "releaseNote"
> & {
  detector: string | null;
  explanationEn: string | null;
  explanationAr: string | null;
  decisionId: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  releaseNote: string | null;
};

/** `GET /quarantines`, newest first, at most 100 (manar-api caps it). Security Admin and Tenant Owner only. */
async function fetchQuarantines(active?: boolean): Promise<AgentQuarantine[]> {
  const { data, error } = await apiClient.GET("/quarantines", {
    params: { query: active === undefined ? {} : { active } },
  });
  if (error) throw error;
  return data.items as unknown as AgentQuarantine[];
}

/** Ids of agents with an active quarantine. Only call for roles that may read quarantines. */
export function useActiveQuarantines(enabled: boolean) {
  return useQuery({
    queryKey: ["quarantines", "active"],
    queryFn: () => fetchQuarantines(true),
    enabled,
    refetchInterval: 10_000,
  });
}

/** This agent's active quarantine, or else its most recent released one, or null if none is listed. */
export function useAgentQuarantine(agentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["quarantines", "agent", agentId],
    queryFn: async () => {
      const active = (await fetchQuarantines(true)).find((q) => q.agentId === agentId);
      if (active) return active;
      // ponytail: only the newest 100 rows are listed, so a very old release may not show.
      return (await fetchQuarantines()).find((q) => q.agentId === agentId) ?? null;
    },
    enabled,
    refetchInterval: 10_000,
  });
}

/** `POST /agents/:id/quarantine/release`. A 404 means there was no active quarantine; the error keeps its statusCode. */
export function useReleaseQuarantine(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      const { data, error } = await apiClient.POST("/agents/{id}/quarantine/release", {
        params: { path: { id: agentId } },
        body: note ? { note } : {},
      });
      if (error) throw error;
      return data as unknown as AgentQuarantine;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["quarantines"] }),
  });
}
