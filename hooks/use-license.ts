"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type TenantLicense = components["schemas"]["TenantLicenseDto"];

/** `GET /tenant/license`: the deployment's licence status for the banner, gated server-side to
 * `TENANT_OWNER`/`SECURITY_ADMIN`. manar-api re-checks the licence hourly, so a slow refetch is
 * enough. */
export function useLicense(enabled: boolean) {
  return useQuery({
    queryKey: ["tenant-license"],
    enabled,
    staleTime: 15 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/tenant/license");
      if (error) throw error;
      return data;
    },
  });
}
