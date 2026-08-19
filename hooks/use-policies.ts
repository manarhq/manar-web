"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

export type PolicySummary = components["schemas"]["GetPolicyResponseDto"];
export type PolicyVersion = components["schemas"]["PolicyVersionResponseDto"];
export type CreatePolicyRequest = components["schemas"]["CreatePolicyRequestDto"];
export type CreatePolicyVersionRequest = components["schemas"]["CreatePolicyVersionRequestDto"];
export type SuggestPolicyRequest = components["schemas"]["SuggestPolicyRequestDto"];
export type SuggestPolicyResponse = components["schemas"]["SuggestPolicyResponseDto"];

async function fetchPoliciesPage(cursor: string | undefined): Promise<CursorPage<PolicySummary>> {
  const { data, error } = await apiClient.GET("/policies", {
    params: { query: { cursor, limit: 50 } },
  });
  if (error) throw error;
  return normalizeCursorPage(data);
}

export function usePoliciesList() {
  return useInfiniteQuery({
    queryKey: ["policies", "list"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchPoliciesPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** Unlike agents/tasks/tools/approvals, Policy has a real `GET
 * /policies/:id` — no list-scan needed here. */
export function usePolicyDetail(id: string) {
  return useQuery({
    queryKey: ["policies", "detail", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/policies/{id}", { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}

/** `GET /policies/:id/versions` — every version, unpaginated (immutable,
 * bounded history per Phase 6's design). */
export function usePolicyVersions(id: string) {
  return useQuery({
    queryKey: ["policies", "versions", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/policies/{id}/versions", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}

/**
 * `GET /policies/:id/versions/:versionId?format=yaml` returns
 * `text/yaml`, not JSON — the generated client (openapi-fetch) assumes
 * JSON bodies, so this bypasses it with a direct `fetch` through the
 * same `/api/bff/*` proxy every other call goes through (still the one
 * and only place that attaches a real Authorization header).
 */
export function usePolicyVersionYaml(id: string, versionId: string | null) {
  return useQuery({
    queryKey: ["policies", "version-yaml", id, versionId],
    queryFn: async () => {
      const response = await fetch(`/api/bff/policies/${id}/versions/${versionId}?format=yaml`, {
        headers: { Accept: "text/yaml" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    },
    enabled: Boolean(id) && Boolean(versionId),
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePolicyRequest) => {
      const { data, error } = await apiClient.POST("/policies", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", "list"] });
    },
  });
}

export function useCreatePolicyVersion(policyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePolicyVersionRequest) => {
      const { data, error } = await apiClient.POST("/policies/{id}/versions", {
        params: { path: { id: policyId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", "versions", policyId] });
      queryClient.invalidateQueries({ queryKey: ["policies", "detail", policyId] });
    },
  });
}

/**
 * `POST /policies/suggest` (design-rework.md's "Suggest with AI"): **not**
 * a preview/dry-run call — per `PolicyController.suggestPolicy`'s own doc
 * comment, when it returns a usable draft (`available: true`) it has
 * already persisted a real `DRAFT` `PolicyVersion` as a side effect,
 * under either an existing policy (`policyId`) or a brand-new one
 * (`policyName`) — exactly one of those two must be set on the request,
 * mirrored client-side by `SuggestPolicyDialog`. Never auto-published;
 * the caller still goes through the normal
 * `POST /policies/:id/versions/:versionId/publish` flow. `available:
 * false` means manar-ai returned nothing usable — nothing was created,
 * this is not an error.
 *
 * `retry: false` is deliberate: this call can legitimately take up to
 * `AI_ADVISORY_LONGFORM_TIMEOUT_MS` (30s default) on the manar-api side,
 * and since a usable response has *already* persisted a DRAFT version
 * server-side as a side effect, a client-side retry after a dropped
 * response risks creating a second draft version for one operator
 * action. It would also count as a repeated failure against the
 * long-form circuit breaker (default threshold 3) on a single
 * slow-but-real request — see task-3-brief.md.
 */
export function useSuggestPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SuggestPolicyRequest) => {
      const { data, error } = await apiClient.POST("/policies/suggest", { body });
      if (error) throw error;
      return data;
    },
    retry: false,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policies", "list"] });
      if (data.policyId) {
        queryClient.invalidateQueries({ queryKey: ["policies", "versions", data.policyId] });
        queryClient.invalidateQueries({ queryKey: ["policies", "detail", data.policyId] });
      }
    },
  });
}

export function usePublishPolicyVersion(policyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await apiClient.POST("/policies/{id}/versions/{versionId}/publish", {
        params: { path: { id: policyId, versionId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", "versions", policyId] });
      queryClient.invalidateQueries({ queryKey: ["policies", "detail", policyId] });
      queryClient.invalidateQueries({ queryKey: ["policies", "list"] });
    },
  });
}
