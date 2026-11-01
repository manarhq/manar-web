"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import type { CursorPage } from "@/lib/api/find-by-id";

/**
 * Secrets page data (manar-api src/secrets). The routes are newer than the generated client, so
 * the path literals are cast until `pnpm api:codegen` is run against a build that has them; the
 * shapes below follow the controller.
 */

export type SecretEventType =
  "secret.touched" | "secret.vault.stored" | "secret.vault.released" | "secret.vault.denied";

export interface SecretEvent {
  id: string;
  hostId: string;
  hostname: string | null;
  type: SecretEventType;
  toolId: string | null;
  process: string | null;
  pathClass: string | null;
  /** Home directory already masked. Never a secret value. */
  maskedPath: string | null;
  blocked: boolean;
  at: string;
}

export type VaultState = "REQUESTED" | "STORED" | "RESTORE_REQUESTED" | "RESTORED" | "FAILED";
export interface VaultEntry {
  id: string;
  hostId: string;
  kind: "aws" | "ssh";
  ref: string;
  state: VaultState;
  detail: string | null;
}

export interface SecretsOverview {
  days: number;
  tools: Array<{
    toolId: string;
    touched: number;
    blocked: number;
    classes: Record<string, number>;
    lastAt: string | null;
  }>;
  devices: Array<{
    hostId: string;
    hostname: string;
    os: string;
    /** ok | monitoring unavailable | unknown (no report yet) */
    watcher: "ok" | "monitoring unavailable" | "unknown";
    vault: VaultEntry[];
  }>;
  pendingAccess: number;
}

export interface VaultAccess {
  id: string;
  hostId: string;
  kind: "aws" | "ssh";
  ref: string;
  program: string;
  /** Full path of the requesting binary, home directory masked. */
  programPath: string;
  /** SHA-256 of that binary as the device read it. */
  programSha: string;
  createdAt: string;
}

export type AccessDecision = "ALLOW_ONCE" | "ALLOW_8H" | "ALLOW_ALWAYS" | "DENY";

type Result = Promise<{ data?: unknown; error?: unknown }>;
async function unwrap<T>(call: Result): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data as T;
}

// The path literals are not in the generated schema yet.
const GET = apiClient.GET as unknown as (path: string, init?: object) => Result;
const POST = apiClient.POST as unknown as (path: string, init?: object) => Result;

export interface TimelineFilters {
  hostId?: string;
  toolId?: string;
  type?: SecretEventType | "";
}

export function useSecretsTimeline(filters: TimelineFilters, limit = 25) {
  return useInfiniteQuery({
    queryKey: [
      "secrets",
      "timeline",
      filters.hostId ?? "",
      filters.toolId ?? "",
      filters.type ?? "",
      limit,
    ],
    queryFn: async ({
      pageParam,
    }: {
      pageParam: string | undefined;
    }): Promise<CursorPage<SecretEvent>> =>
      normalizeCursorPage(
        await unwrap<{ items: SecretEvent[]; nextCursor: unknown }>(
          GET("/secrets/timeline", {
            params: {
              query: {
                hostId: filters.hostId || undefined,
                toolId: filters.toolId || undefined,
                type: filters.type || undefined,
                limit,
                cursor: pageParam,
              },
            },
          }),
        ),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
}

export function useSecretsOverview(days = 7) {
  return useQuery({
    queryKey: ["secrets", "overview", days],
    queryFn: () =>
      unwrap<SecretsOverview>(GET("/secrets/overview", { params: { query: { days } } })),
    refetchInterval: 30_000,
  });
}

export function useVaultAccess() {
  return useQuery({
    queryKey: ["secrets", "access"],
    queryFn: () => unwrap<VaultAccess[]>(GET("/secrets/access")),
    refetchInterval: 5_000,
  });
}

export function useAccessDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: AccessDecision }) =>
      unwrap(
        POST("/secrets/access/{id}/decide".replace("{id}", encodeURIComponent(id)), {
          body: { decision },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secrets"] }),
  });
}

/** Protect one secret in the device vault, or restore it to its file. */
export function useVaultAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      hostId,
      kind,
      ref,
      restore,
    }: {
      hostId: string;
      kind: "aws" | "ssh";
      ref: string;
      restore?: boolean;
    }) =>
      unwrap(
        POST(`/secrets/vault/${encodeURIComponent(hostId)}${restore ? "/restore" : ""}`, {
          body: { kind, ref },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secrets"] }),
  });
}
