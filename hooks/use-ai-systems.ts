"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";
import type { components } from "@/lib/api/schema";

/**
 * `GET|POST /ai-systems` and friends — the governed AI-system inventory
 * (release 2026-11-11). Same shape as every other resource's hook file:
 * one cursor-paginated `useInfiniteQuery` for the list, plain `useQuery`
 * for the real per-record endpoints, and `useMutation` for the writes,
 * each invalidating exactly the keys its response can have changed.
 *
 * Two things about this resource are deliberately different and are
 * reflected here rather than papered over:
 *
 * 1. **The list carries no `coverage`.** `AiSystemSummaryDto` genuinely
 *    has no coverage field, and `GET /ai-systems` deliberately has no
 *    `coverage` filter (its own OpenAPI description explains why:
 *    deriving it per row for a whole tenant, or filtering only the
 *    current page, would both make the returned counts untrustworthy).
 *    So there is no `useAiSystemsCoverage`-style fan-out here and the
 *    list view must not imply one — coverage is a per-record fact read
 *    from `GET /ai-systems/:id`.
 * 2. **Lifecycle never moves through `PATCH`.** `useTransitionAiSystem`
 *    is the only hook that can change `lifecycleState`, mirroring the
 *    API's own rule.
 */

export type AiSystemLifecycleState = components["schemas"]["AiSystemSummaryDto"]["lifecycleState"];
export type AiSystemEnvironment = components["schemas"]["AiSystemSummaryDto"]["environment"];
export type AiSystemDataClassification =
  components["schemas"]["AiSystemSummaryDto"]["dataClassification"];
export type AiSystemCoverageValue = components["schemas"]["AiSystemCoverageDto"]["coverage"];

/**
 * manar-api declares its nullable properties with `@ApiProperty({
 * nullable: true })` and no explicit `type`, so `openapi-typescript`
 * emits `Record<string, never> | null` (`{} | null`) rather than the real
 * `string | null`. Every other resource's hook file normalizes the same
 * way (see hooks/use-incidents.ts / use-tools.ts) — the alternative would
 * be hand-editing the generated `lib/api/schema.d.ts`, which is
 * forbidden, or leaking `{}` into every component that renders one of
 * these fields.
 */
export type AiSystemSummary = Omit<
  components["schemas"]["AiSystemSummaryDto"],
  "declaredProvider" | "declaredModel" | "nextReviewDate"
> & {
  declaredProvider: string | null;
  declaredModel: string | null;
  nextReviewDate: string | null;
};

export type AiSystemCoverage = Omit<
  components["schemas"]["AiSystemCoverageDto"],
  "lastObservedAt"
> & {
  lastObservedAt: string | null;
};

export type AiSystemLinkedAgent = Omit<
  components["schemas"]["AiSystemLinkedAgentDto"],
  "lastObservedAt"
> & {
  lastObservedAt: string | null;
};

export type AiSystemLinkedTool = components["schemas"]["AiSystemLinkedToolDto"];

export type AiSystemDetail = Omit<
  components["schemas"]["AiSystemDetailDto"],
  "declaredProvider" | "declaredModel" | "nextReviewDate" | "coverage" | "linkedAgents"
> & {
  declaredProvider: string | null;
  declaredModel: string | null;
  nextReviewDate: string | null;
  coverage: AiSystemCoverage;
  linkedAgents: AiSystemLinkedAgent[];
};

export type AiSystemVersion = components["schemas"]["AiSystemVersionDto"];
export type AiSystemTransition = components["schemas"]["AiSystemTransitionDto"];

export type CreateAiSystemRequest = components["schemas"]["CreateAiSystemRequestDto"];

/** The real request shape for `PATCH /ai-systems/:id`. `changeReason` is
 * required by the API on every update — it is a first-class field here,
 * never defaulted, because an unexplained material change is not evidence
 * of anything (the endpoint's own words). The three nullable fields are
 * typed as their real `string | null` for the same codegen reason as
 * above; explicit `null` clears a declaration, `undefined`/omitted leaves
 * it unchanged. */
export interface UpdateAiSystemRequest {
  name?: string;
  businessPurpose?: string;
  ownerId?: string;
  businessUnit?: string;
  environment?: AiSystemEnvironment;
  dataClassification?: AiSystemDataClassification;
  declaredProvider?: string | null;
  declaredModel?: string | null;
  riskRationale?: string;
  nextReviewDate?: string | null;
  changeReason: string;
}

export interface TransitionAiSystemRequest {
  toState: AiSystemLifecycleState;
  reason: string;
}

export interface AiSystemsListFilters {
  lifecycleState?: AiSystemLifecycleState;
  environment?: AiSystemEnvironment;
  ownerId?: string;
}

async function fetchAiSystemsPage(
  filters: AiSystemsListFilters,
  cursor: string | undefined,
): Promise<CursorPage<AiSystemSummary>> {
  const { data, error } = await apiClient.GET("/ai-systems", {
    params: {
      query: {
        lifecycleState: filters.lifecycleState,
        environment: filters.environment,
        ownerId: filters.ownerId,
        cursor,
        limit: 50,
      },
    },
  });
  if (error) throw error;
  return normalizeCursorPage(data) as unknown as CursorPage<AiSystemSummary>;
}

/** Server-side filtering through the endpoint's own real query params —
 * `lifecycleState`, `environment`, `ownerId`. There is deliberately no
 * coverage filter to pass (see this file's header). */
export function useAiSystemsList(filters: AiSystemsListFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["ai-systems", "list", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchAiSystemsPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** A real `GET /ai-systems/:id` exists (unlike agents/tasks/tools), so no
 * list scan is needed — and it is the only source of `coverage`. */
export function useAiSystemDetail(id: string) {
  return useQuery({
    queryKey: ["ai-systems", "detail", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/ai-systems/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as unknown as AiSystemDetail;
    },
    enabled: Boolean(id),
  });
}

export function useAiSystemVersions(id: string) {
  return useQuery({
    queryKey: ["ai-systems", "versions", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/ai-systems/{id}/versions", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as AiSystemVersion[];
    },
    enabled: Boolean(id),
  });
}

export function useAiSystemTransitions(id: string) {
  return useQuery({
    queryKey: ["ai-systems", "transitions", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/ai-systems/{id}/transitions", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as AiSystemTransition[];
    },
    enabled: Boolean(id),
  });
}

function invalidateOne(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ["ai-systems", "list"] });
  queryClient.invalidateQueries({ queryKey: ["ai-systems", "detail", id] });
  queryClient.invalidateQueries({ queryKey: ["ai-systems", "versions", id] });
  queryClient.invalidateQueries({ queryKey: ["ai-systems", "transitions", id] });
}

/** `POST /ai-systems` — always lands in DRAFT; the caller cannot choose a
 * starting state, so this request body has no `lifecycleState`. */
export function useCreateAiSystem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAiSystemRequest) => {
      const { data, error } = await apiClient.POST("/ai-systems", { body });
      if (error) throw error;
      return data as unknown as AiSystemSummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-systems", "list"] });
    },
  });
}

export function useUpdateAiSystem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateAiSystemRequest) => {
      const { data, error } = await apiClient.PATCH("/ai-systems/{id}", {
        params: { path: { id } },
        // The generated request type spells the three nullable fields
        // `Record<string, never> | null` (see the codegen note at the top
        // of this file); the real wire contract is `string | null`.
        body: body as unknown as components["schemas"]["UpdateAiSystemRequestDto"],
      });
      if (error) throw error;
      return data as unknown as AiSystemSummary;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

/** `POST /ai-systems/:id/transitions` — the ONLY path that changes
 * `lifecycleState`. A 409 means the requested edge is not in the server's
 * allowed-transition table; a 403 means either an insufficient role or
 * the separation-of-duties rule on `REVIEW -> ACTIVE`. Callers render
 * those two as distinct, actionable messages rather than one "forbidden". */
export function useTransitionAiSystem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TransitionAiSystemRequest) => {
      const { data, error } = await apiClient.POST("/ai-systems/{id}/transitions", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data as unknown as AiSystemSummary;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

/** `POST /ai-systems/:id/agents`. Re-linking an already-linked agent
 * returns `linked: false` rather than a 409, so the caller can tell "we
 * just linked it" from "it was already linked" without guessing. */
export function useLinkAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await apiClient.POST("/ai-systems/{id}/agents", {
        params: { path: { id } },
        body: { agentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useUnlinkAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await apiClient.DELETE("/ai-systems/{id}/agents/{agentId}", {
        params: { path: { id, agentId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useLinkTool(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toolId: string) => {
      const { data, error } = await apiClient.POST("/ai-systems/{id}/tools", {
        params: { path: { id } },
        body: { toolId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useUnlinkTool(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toolId: string) => {
      const { data, error } = await apiClient.DELETE("/ai-systems/{id}/tools/{toolId}", {
        params: { path: { id, toolId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateOne(queryClient, id),
  });
}
