"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

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

/** Pages of 200, newest first; the next page is the `nextBefore` manar-api returns. */
export function useSessions(days = 14) {
  return useInfiniteQuery({
    queryKey: ["sessions", days],
    queryFn: ({ pageParam }) =>
      bff<{ sessions: SessionSummary[]; nextBefore: string | null }>(
        `/sessions?days=${days}${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
    select: (d) => d.pages.flatMap((p) => p.sessions),
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
