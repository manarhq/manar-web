"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { idempotencyHeader } from "@/lib/api/idempotency";

// TODO: switch to the generated client (`pnpm api:codegen`) once manar-api serves these routes.
export interface DataFlags {
  improveManar: boolean;
  aiTraining: boolean;
}
export interface DataPreferences extends DataFlags {
  /** The workspace's override; null on personal workspaces. */
  org: DataFlags | null;
  effective: DataFlags;
  noticeDismissed: boolean;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...idempotencyHeader(init?.method) },
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });

const KEY = ["data-preferences"] as const;
const ORG_KEY = ["workspace-data-preferences"] as const;

export function useDataPreferences() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => call<DataPreferences>("/me/data-preferences"),
    retry: false,
  });
}

export function useSetDataPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DataFlags> & { noticeDismissed?: boolean }) =>
      call<unknown>("/me/data-preferences", put(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Managers on Company and Government workspaces; anyone else gets 403, which shows nothing. */
export function useWorkspaceDataPreferences() {
  return useQuery({
    queryKey: ORG_KEY,
    queryFn: () => call<DataFlags>("/workspace/data-preferences"),
    retry: false,
  });
}

export function useSetWorkspaceDataPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DataFlags) => call<unknown>("/workspace/data-preferences", put(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ORG_KEY });
      return queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
