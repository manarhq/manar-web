"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

// Hand-typed until `pnpm api:codegen` runs against a manar-api that serves /billing.
export type PlanName = "free" | "pro" | "company_trial" | "company" | "enterprise";
export interface BillingStatus {
  plan: PlanName;
  status: "active" | "past_due" | "read_only";
  /** `null` = unlimited. */
  limits: {
    devices: number | null;
    agents: number | null;
    cloudAgents: number | null;
    auditDays: number | null;
  };
  features: string[];
  trialEndsAt: string | null;
  usage: { devices: number; agents: number; cloudAgents: number };
  interval: string | null;
  billingEnabled: boolean;
  hasSubscription: boolean;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw await res.json().catch(() => ({ statusCode: res.status }));
  return (await res.json()) as T;
}

export function useBilling() {
  return useQuery({ queryKey: ["billing"], queryFn: () => call<BillingStatus>("/billing") });
}

/** Opens Stripe Checkout (`plan`) or the Customer Portal (no plan) in this tab. */
export function useBillingRedirect() {
  return useMutation({
    mutationFn: async (plan?: "pro_monthly" | "pro_yearly" | "company") => {
      const { url } = plan
        ? await call<{ url: string }>("/billing/checkout", {
            method: "POST",
            body: JSON.stringify({ plan }),
          })
        : await call<{ url: string }>("/billing/portal", { method: "POST" });
      window.location.assign(url);
    },
  });
}
