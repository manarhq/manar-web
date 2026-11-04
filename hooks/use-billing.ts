"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { idempotencyHeader } from "@/lib/api/idempotency";

// Hand-typed until `pnpm api:codegen` runs against a manar-api that serves /billing.
export type PlanName = "free" | "trial" | "pro" | "company_trial" | "company" | "enterprise";
export type CheckoutPlan =
  "pro_monthly" | "pro_yearly" | "company_monthly" | "company_yearly" | "company_trial";
export interface BillingStatus {
  plan: PlanName;
  status: "active" | "past_due" | "read_only" | "frozen";
  /** `null` = unlimited. */
  limits: {
    devices: number | null;
    agents: number | null;
    cloudAgents: number | null;
    auditDays: number | null;
  };
  features: string[];
  allowance: { ai: number; cloudMinutes: number };
  trialEndsAt: string | null;
  committedSeats: number | null;
  usage: { devices: number; agents: number; cloudAgents: number };
  interval: string | null;
  workspaceKind: "PERSONAL" | "COMPANY" | "SAMPLE";
  billingEnabled: boolean;
  hasSubscription: boolean;
  trialUsed: boolean;
}

/** `GET /billing/usage`: this month so far. */
export interface UsageStatus {
  month: string;
  plan: PlanName;
  allowance: {
    ai: { used: number; included: number };
    cloudMinutes: { used: number; included: number };
  };
  wallet: {
    available: boolean;
    balance: number;
    expiringSoon: { credits: number; expiresAt: string }[];
    /** Credits that may be spent above the allowance this month; null = no cap. */
    capCredits: number | null;
    creditsSpent: number;
    autoTopUp: boolean;
    topUpsThisMonth: number;
  };
  active: { kind: "device" | "seat"; count: number; onTheirWay: number };
  bill: {
    currency: "usd";
    soFarCents: number;
    forecastCents: number;
    extraUnitsSoFar: number;
    extraUnitsForecast: number;
    creditsForecast: number;
  };
  alerts: string[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...idempotencyHeader(init?.method) },
  });
  if (!res.ok) throw await res.json().catch(() => ({ statusCode: res.status }));
  return (await res.json()) as T;
}

export function useBilling() {
  return useQuery({ queryKey: ["billing"], queryFn: () => call<BillingStatus>("/billing") });
}

/** Usage and bill so far. `enabled` lets callers that may not have the role skip the request. */
export function useUsage(enabled = true) {
  return useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => call<UsageStatus>("/billing/usage"),
    enabled,
    retry: false,
    // The device and seat counts change hourly; credits change as they are spent.
    refetchInterval: 60_000,
  });
}

/** Opens Stripe Checkout (`plan`) or the Customer Portal (no plan) in this tab. */
export function useBillingRedirect() {
  return useMutation({
    mutationFn: async (input?: { plan: CheckoutPlan; seats?: number }) => {
      const { url } = input
        ? await call<{ url: string }>("/billing/checkout", {
            method: "POST",
            body: JSON.stringify(input),
          })
        : await call<{ url: string }>("/billing/portal", { method: "POST" });
      window.location.assign(url);
    },
  });
}

/** Opens Stripe Checkout for credit packs ($5 = 1,000 credits). */
export function useBuyCredits() {
  return useMutation({
    mutationFn: async (packs: number) => {
      const { url } = await call<{ url: string }>("/billing/credits", {
        method: "POST",
        body: JSON.stringify({ packs }),
      });
      window.location.assign(url);
    },
  });
}

/** Monthly cap (USD, null = no cap) and auto top-up. */
export function useWalletSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { capUsd?: number | null; autoTopUp?: boolean }) =>
      call<UsageStatus>("/billing/wallet", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => qc.setQueryData(["billing", "usage"], data),
  });
}

/** One-click cancel of the Company trial: nothing is charged; the workspace moves to Free. */
export function useCancelTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ cancelled: boolean }>("/billing/trial/cancel", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}
