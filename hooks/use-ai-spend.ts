"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AiSpend, SpendSettings } from "@/lib/personal/ai-spend";

/** The routes declare no response DTOs, so the calls cast at the edge like use-ai-tools.ts. */
async function unwrap<T>(call: Promise<{ data?: unknown; error?: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data as T;
}

export function useAiSpend() {
  return useQuery({
    queryKey: ["ai-spend"],
    queryFn: () => unwrap<AiSpend>(apiClient.GET("/ai-spend" as never)),
    refetchInterval: 60_000,
  });
}

export function useSaveSpendSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SpendSettings) =>
      unwrap<SpendSettings>(apiClient.PUT("/ai-spend/settings" as never, { body } as never)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-spend"] }),
  });
}
