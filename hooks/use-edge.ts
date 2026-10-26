"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AuditEvent } from "@/hooks/use-audit";
import type { components } from "@/lib/api/schema";

export type AgentEdgeStatus = components["schemas"]["AgentEdgeStatusDto"];
export type EgressRule = components["schemas"]["EgressRuleDto"];

/** The two gateway decision events (manar-api docs/edge.md, "Gateway sync API"). */
export const EGRESS_DECISION_EVENTS = ["agent.egress.allowed", "agent.egress.denied"] as const;

/**
 * `GET /agents/:id/edge`: the peer row exactly as manar-api's last refresh wrote it.
 * Security Admin and Tenant Owner only, so callers pass `enabled` from the role check.
 */
export function useAgentEdge(agentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["edge", "status", agentId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/agents/{id}/edge", {
        params: { path: { id: agentId } },
      });
      if (error) throw error;
      return data;
    },
    enabled,
    refetchInterval: 10_000,
  });
}

/** `GET /agents/:id/egress-rules`: the agent's allow-list. */
export function useEgressRules(agentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["edge", "rules", agentId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/agents/{id}/egress-rules", {
        params: { path: { id: agentId } },
      });
      if (error) throw error;
      return data.items;
    },
    enabled,
  });
}

/** `POST /agents/:id/egress-rules`. manar-api validates the host and is the authority. */
export function useAddEgressRule(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["AddEgressRuleDto"]) => {
      const { data, error } = await apiClient.POST("/agents/{id}/egress-rules", {
        params: { path: { id: agentId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["edge", "rules", agentId] }),
  });
}

/** `DELETE /agents/:id/egress-rules/:ruleId`. */
export function useRemoveEgressRule(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await apiClient.DELETE("/agents/{id}/egress-rules/{ruleId}", {
        params: { path: { id: agentId, ruleId } },
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["edge", "rules", agentId] }),
  });
}

/** The newest gateway decisions for this agent: one `GET /audit` page, both event types. */
export function useEgressDecisions(agentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["audit", "egress", agentId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/audit", {
        params: {
          query: { eventType: EGRESS_DECISION_EVENTS.join(","), agentId, limit: 20 },
        },
      });
      if (error) throw error;
      return data.items as unknown as AuditEvent[];
    },
    enabled,
    refetchInterval: 15_000,
  });
}
