"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type ComplianceFramework = components["schemas"]["ComplianceFrameworkSummaryDto"];
export type ComplianceMappingStatus =
  components["schemas"]["ComplianceMappingSummaryDto"]["status"];

/** Same `{} | null` -> real-type normalization as every other resource's
 * nullable field (manar-api's `@ApiProperty({ nullable: true })` without
 * an explicit `type` — see hooks/use-tasks.ts). */
export type ComplianceMapping = Omit<
  components["schemas"]["ComplianceMappingSummaryDto"],
  "evidenceReference"
> & {
  evidenceReference: string | null;
};
export type ComplianceControl = Omit<
  components["schemas"]["ComplianceControlWithMappingDto"],
  "mapping"
> & {
  mapping: ComplianceMapping | null;
};

/**
 * `GET /compliance/frameworks` — a small, fixed reference set (currently
 * ISO/IEC 27001:2022 and NIST AI RMF 1.0, Phase 15a), never paginated.
 */
export function useComplianceFrameworks() {
  return useQuery({
    queryKey: ["compliance", "frameworks"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/compliance/frameworks");
      if (error) throw error;
      return data.items;
    },
  });
}

/** `GET /compliance/frameworks/:id/controls` — every control mapped for
 * one framework, each with its current status/evidence. Not paginated
 * (Phase 15a seeds a representative subset per framework, not exhaustive
 * coverage — bounded by construction). */
export function useComplianceControls(frameworkId: string | undefined) {
  return useQuery({
    queryKey: ["compliance", "controls", frameworkId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/compliance/frameworks/{id}/controls", {
        params: { path: { id: frameworkId as string } },
      });
      if (error) throw error;
      return data.items as unknown as ComplianceControl[];
    },
    enabled: Boolean(frameworkId),
  });
}
