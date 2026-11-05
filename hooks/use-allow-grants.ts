"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

/** Where a permission came from: an 8-hour approval, "always allow this here" offered after three
 * approvals, or accepted from what Manar saw while a new device learned. */
export type GrantOrigin = "approval" | "offer" | "learning";

export interface AllowGrant {
  id: string;
  origin: GrantOrigin;
  hostId: string | null;
  hostName: string | null;
  toolId: string;
  actionId: string;
  /** The exact resource of an 8-hour grant, or the folder / site an always-allow covers. */
  scope: string;
  createdAt: string;
  expiresAt: string;
  useCount: number;
}

/** `GET /approvals/allow-grants`: every live permission that skips the prompt (approvers only). */
export function useAllowGrants() {
  return useQuery({
    queryKey: ["allow-grants"],
    queryFn: async () => (await bffJson<{ items: AllowGrant[] }>("/approvals/allow-grants")).items,
    retry: false,
  });
}

/** Withdrawing only ever adds protection, but the row stays until the server has said yes. */
export function useWithdrawGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      bffJson<{ id: string }>(`/approvals/allow-grants/${encodeURIComponent(id)}/revoke`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allow-grants"] }),
  });
}
