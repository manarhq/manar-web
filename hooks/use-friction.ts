"use client";

import { useQuery } from "@tanstack/react-query";

import { bffJson } from "@/lib/api/raw";

export interface FrictionNumbers {
  prompts: number;
  approvals: number;
  denies: number;
  expired: number;
  deniedLaterApproved: number;
  answered: number;
  avgAnswerSeconds: number;
  blockedMinutes: number;
}

export interface FrictionReport {
  scope: "workspace" | "me";
  days: number;
  budget: number;
  developers: number;
  avgPromptsPerDeveloperPerDay: number;
  overBudget: boolean;
  totals: FrictionNumbers;
  series: Array<FrictionNumbers & { day: string }>;
  /** Approvers only. `name` is null for devices without an owner. */
  people?: Array<FrictionNumbers & { name: string | null; me: boolean }>;
}

/** `GET /friction`: how much Manar asked, per day and (for approvers) per person. Counts and times only. */
export function useFriction(days: number) {
  return useQuery({
    queryKey: ["friction", days],
    queryFn: () => bffJson<FrictionReport>(`/friction?days=${days}`),
    // A role without access, or an older API, simply has no card.
    retry: false,
    staleTime: 60_000,
  });
}
