"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Undo AI file changes (manar-api docs/hosts.md): the files an AI tool changed outside its
 * project folder on one device, and the restore request. The two routes are new and not in the
 * generated schema yet, so these calls go through the BFF with `fetch`; `pnpm api:codegen` after
 * the API merges will let them move to `apiClient`. Metadata only: file contents stay on the device.
 */
export type RestoreStatus = "NONE" | "REQUESTED" | "RESTORED" | "FAILED";

export interface HostChange {
  id: string;
  tool: string;
  path: string;
  existed: boolean;
  sizeBytes: number;
  takenAt: string;
  expiresAt: string;
  restoreStatus: RestoreStatus;
  restoreRequestedAt: string | null;
  restoreDoneAt: string | null;
  restoreError: string | null;
}

async function bff<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw body;
  return body as T;
}

export function useHostChanges(hostId: string) {
  return useQuery({
    queryKey: ["hosts", "changes", hostId],
    queryFn: async () =>
      (await bff<{ items: HostChange[] }>(`/hosts/${encodeURIComponent(hostId)}/changes`)).items,
    enabled: Boolean(hostId),
    // While the device is working on a restore, look again every 10 s.
    refetchInterval: (q) =>
      q.state.data?.some((c) => c.restoreStatus === "REQUESTED") ? 10_000 : false,
  });
}

export function useRestoreChange(hostId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeId: string) =>
      bff<{ id: string }>(
        `/hosts/${encodeURIComponent(hostId)}/changes/${encodeURIComponent(changeId)}/restore`,
        { method: "POST", body: "{}" },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosts", "changes", hostId] }),
  });
}
