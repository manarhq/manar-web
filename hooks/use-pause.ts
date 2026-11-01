"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

/** `GET /workspace/pause`: is every protected tool paused ("Pause all AI")? */
export interface PauseStatus {
  paused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
}

export function usePauseStatus() {
  return useQuery({
    queryKey: ["workspace", "pause"],
    queryFn: () => bffJson<PauseStatus>("/workspace/pause"),
    // Someone on the phone may press it: look again gently.
    refetchInterval: 10_000,
    // A role without access simply sees no button.
    retry: false,
  });
}

export function useSetPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paused: boolean) =>
      bffJson<PauseStatus>("/workspace/pause", { method: "PUT", body: { paused, via: "console" } }),
    onSuccess: (status) => queryClient.setQueryData(["workspace", "pause"], status),
  });
}
