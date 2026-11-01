"use client";

import { useQuery } from "@tanstack/react-query";

import type { McpServerRow, SessionDetail, SessionSummary } from "@/lib/insight/types";

/** manar-api endpoints of the insight track, called through the BFF like use-features.ts. */
async function bff<T>(path: string): Promise<T> {
  const res = await fetch(`/api/bff${path}`, { headers: { "content-type": "application/json" } });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

export function useMcpServers() {
  return useQuery({
    queryKey: ["mcp-servers"],
    queryFn: async () => (await bff<{ servers: McpServerRow[] }>("/mcp-servers")).servers,
    refetchInterval: 60_000,
  });
}

export function useSessions(days = 14) {
  return useQuery({
    queryKey: ["sessions", days],
    queryFn: async () =>
      (await bff<{ sessions: SessionSummary[] }>(`/sessions?days=${days}`)).sessions,
    refetchInterval: 60_000,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => bff<SessionDetail>(`/sessions/${encodeURIComponent(id)}`),
    retry: false,
  });
}
