"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

/**
 * Cloud agents (ChatGPT, Claude, Copilot Studio) on the tenant (manar-api docs/cloud-agents.md).
 * The controller declares no body DTOs, so request and response shapes are cast at the edge; the
 * path literals stay type-checked.
 */

export interface CloudAgent {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  /** Over the plan's cloud agent limit: refused at the gate, not deleted. */
  paused: boolean;
  platform: "CHATGPT" | "COPILOT_STUDIO" | null;
  mcpUrl: string | null;
  /** A self-registered client (ChatGPT) waiting for the owner to confirm it. */
  pendingClientId: string | null;
  oauthClientId: string | null;
}

export interface CloudAgentList {
  limit: { max: number | null; used: number };
  chatGptAvailable: boolean;
  items: CloudAgent[];
}

export interface ConnectedCloudAgent {
  agent: { id: string; slug: string };
  platform: "CHATGPT" | "COPILOT_STUDIO";
  mcpUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl: string;
  scopes: string[];
  /** Pre-registered client (Claude, Copilot Studio): the secret is in this response only. */
  clientId?: string;
  clientSecret?: string;
}

type Result = Promise<{ data?: unknown; error?: unknown }>;
async function unwrap<T>(call: Result): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data as T;
}
const path = (id: string) => ({ params: { path: { id } } });

const KEY = ["cloud-agents"] as const;

export function useCloudAgents() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => unwrap<CloudAgentList>(apiClient.GET("/cloud-agents")),
  });
}

export interface ConnectInput {
  slug: string;
  displayName: string;
  platform: "CHATGPT" | "COPILOT_STUDIO";
  redirectUris: string[];
  task: { name: string; expiresAt: string };
}

export function useConnectCloudAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectInput) =>
      unwrap<ConnectedCloudAgent>(apiClient.POST("/cloud-agents", { body: input as never })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Copilot Studio shows its callback URL only after the connector exists. */
export function useSetRedirectUris() {
  return useMutation({
    mutationFn: ({ id, redirectUris }: { id: string; redirectUris: string[] }) =>
      unwrap<unknown>(
        apiClient.PUT("/cloud-agents/{id}/redirect-uris", {
          ...path(id),
          body: { redirectUris } as never,
        }),
      ),
  });
}

export function useConfirmCloudClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      unwrap<unknown>(
        apiClient.POST("/cloud-agents/{id}/oauth-client/confirm", {
          ...path(id),
          body: { clientId } as never,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDisconnectCloudAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      unwrap<unknown>(
        apiClient.DELETE("/cloud-agents/{id}", { ...path(id), body: { reason } as never }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
