"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

export interface LearningSetting {
  enabled: boolean;
  days: number;
  source: "default" | "workspace";
}

export interface LearningDevice {
  hostId: string;
  hostname: string;
  learning: { active: boolean; endsAt: string | null; off: boolean };
  wouldHaveAsked: number;
}

export interface LearningSuggestion {
  id: string;
  hostId: string;
  hostname: string | null;
  toolId: string;
  actionId: string;
  scope: string;
  count: number;
  lastSeenAt: string;
  /** How long accepting lasts, from the API; absent from an older API. */
  lastsDays?: number;
}

export interface LearningSummary {
  learning: LearningSetting;
  totalWouldHaveAsked: number;
  devices: LearningDevice[];
  suggestions: LearningSuggestion[];
}

/** `GET /workspace/learning`: what Manar saw while new devices learned (approvers only). */
export function useLearningSummary() {
  return useQuery({
    queryKey: ["learning"],
    queryFn: () => bffJson<LearningSummary>("/workspace/learning"),
    retry: false,
  });
}

function useLearningMutation<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["learning"] }),
        queryClient.invalidateQueries({ queryKey: ["allow-grants"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-tools"] }),
      ]),
  });
}

/** Accepting makes a standing permission, so the row waits for the server. */
export function useAcceptSuggestion() {
  return useLearningMutation((id: string) =>
    bffJson(`/workspace/learning/suggestions/${encodeURIComponent(id)}/accept`, {
      method: "POST",
    }),
  );
}

export function useDismissSuggestion() {
  return useLearningMutation((id: string) =>
    bffJson(`/workspace/learning/suggestions/${encodeURIComponent(id)}/dismiss`, {
      method: "POST",
    }),
  );
}

export function useSetDeviceLearning() {
  return useLearningMutation((v: { hostId: string; action: "off" | "on" | "restart" }) =>
    bffJson(`/workspace/learning/devices/${encodeURIComponent(v.hostId)}`, {
      method: "PUT",
      body: { action: v.action },
    }),
  );
}
