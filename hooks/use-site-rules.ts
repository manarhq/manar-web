"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";
import type { SiteRule } from "@/lib/personal/site-rules";

/** `GET /jail/site-rules`: every remembered answer in the workspace. */
export function useSiteRules() {
  return useQuery({
    queryKey: ["jail", "site-rules"],
    queryFn: async () => (await bffJson<{ items: SiteRule[] }>("/jail/site-rules")).items,
    refetchInterval: 30_000,
    retry: false,
  });
}

export interface NewSiteRule {
  hostId: string;
  toolId: string;
  site: string;
  mode: "ALLOW" | "DENY";
  /** Hours the rule lasts; omit for always. */
  hours?: number;
}

export function useAddSiteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSiteRule) =>
      bffJson<{ id: string }>("/jail/site-rules", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jail"] }),
  });
}

export function useRemoveSiteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      bffJson<{ removed: boolean }>(`/jail/site-rules/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jail"] }),
  });
}
