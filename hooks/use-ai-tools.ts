"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AiToolsDevice } from "@/lib/personal/ai-tools";

/**
 * GET /ai-tools and the Protect switch (manar-api src/host-coverage). The routes declare no
 * response DTOs, so the calls cast at the edge like use-hosts.ts; run `pnpm api:codegen` against a
 * live API to add the paths to the generated schema.
 */
async function unwrap<T>(call: Promise<{ data?: unknown; error?: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data as T;
}

export function useAiTools() {
  return useQuery({
    queryKey: ["ai-tools"],
    queryFn: async () =>
      (await unwrap<{ devices: AiToolsDevice[] }>(apiClient.GET("/ai-tools" as never))).devices,
    refetchInterval: 60_000,
  });
}

export function useSetProtection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      hostId,
      toolId,
      protect,
    }: {
      hostId: string;
      toolId: string;
      protect: boolean;
    }) =>
      unwrap<{ toolId: string; desiredProtection: boolean }>(
        apiClient.POST(
          `/ai-tools/{hostId}/{toolId}/${protect ? "protect" : "unprotect"}` as never,
          { params: { path: { hostId, toolId } } } as never,
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tools"] }),
  });
}
