"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type TenantSettings = components["schemas"]["TenantSettingsResponseDto"];
export type UpdateTenantSettingsRequest = components["schemas"]["UpdateTenantSettingsRequestDto"];

const QUERY_KEY = ["tenant-settings"] as const;

/** `GET /tenant/settings` — gated server-side to `TENANT_OWNER`/
 * `SECURITY_ADMIN` for both reads and writes (residency/SSO/AI-provider
 * are security-adjacent, not general operational data). Backs all four
 * `/settings/*` pages so they always show genuinely current values. */
export function useTenantSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/tenant/settings");
      if (error) throw error;
      return data;
    },
  });
}

/** `PATCH /tenant/settings` — partial update; only
 * `residency`/`allowExternalAi`/`allowOutboundTelemetry`/`allowCloudStorage`
 * are writable. Seeds the query cache with the real response rather than
 * just invalidating, so a page that just persisted a change immediately
 * reflects the server's own confirmed state (including `updatedAt`). */
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTenantSettingsRequest) => {
      const { data, error } = await apiClient.PATCH("/tenant/settings", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
