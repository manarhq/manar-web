"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { idempotencyHeader } from "@/lib/api/idempotency";

// Hand-typed until `pnpm api:codegen` runs against a manar-api that serves these routes.
export interface LaunchOfferCounter {
  enabled: boolean;
  total: number;
  claimed: number;
  remaining: number;
}
export type BadgeSettings =
  | { enabled: false }
  | { enabled: true; slug: string; badgeUrl: string; profileUrl: string; markdown: string };
export interface EmailPrefs {
  weeklyDigest: boolean;
  timezone: string;
  locale: "en" | "ar";
}
export interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}
export interface InviteCreated {
  id: string;
  email: string;
  emailed: boolean;
  link: string;
}
export interface AutoJoin {
  available: boolean;
  enabled: boolean;
  seatCap: number;
}
export interface ContactStatus {
  email: string | null;
  verified: boolean;
  /** The sign-in address is the realm placeholder and nothing is verified yet. */
  needsEmail: boolean;
  pending: boolean;
}
export type DeletionStatus =
  | { scheduled: false; refused?: "sole_owner" }
  | { scheduled: true; executeAfter: string; requestedAt: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...idempotencyHeader(init?.method) },
  });
  if (!res.ok) throw await res.json().catch(() => ({ statusCode: res.status }));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export function useLaunchOffer() {
  return useQuery({
    queryKey: ["launch-offer"],
    queryFn: () => call<LaunchOfferCounter>("/public/launch-offer"),
    staleTime: 30_000,
  });
}

export function useBadge() {
  return useQuery({ queryKey: ["badge"], queryFn: () => call<BadgeSettings>("/workspace/badge") });
}
export function useSetBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      call<BadgeSettings>("/workspace/badge", json("PUT", { enabled })),
    onSuccess: (data) => qc.setQueryData(["badge"], data),
  });
}

export function useEmailPrefs() {
  return useQuery({
    queryKey: ["email-prefs"],
    queryFn: () => call<EmailPrefs>("/me/email-preferences"),
  });
}
export function useSetEmailPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<EmailPrefs>) =>
      call<EmailPrefs>("/me/email-preferences", json("PUT", p)),
    onSuccess: (data) => qc.setQueryData(["email-prefs"], data),
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: () => call<{ items: Invite[] }>("/workspace/invites"),
  });
}
export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; role: string }) =>
      call<InviteCreated>("/workspace/invites", json("POST", v)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}
export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/workspace/invites/${id}`, json("DELETE")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) =>
      call<{ tenantId: string }>("/workspaces/invites/accept", json("POST", { token })),
  });
}

export function useAutoJoin() {
  return useQuery({
    queryKey: ["auto-join"],
    queryFn: () => call<AutoJoin>("/workspace/auto-join"),
  });
}
export function useSetAutoJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { enabled: boolean; seatCap?: number }) =>
      call<AutoJoin>("/workspace/auto-join", json("PUT", v)),
    onSuccess: (data) => qc.setQueryData(["auto-join"], data),
  });
}

export function useDeletion() {
  return useQuery({
    queryKey: ["deletion"],
    queryFn: () => call<DeletionStatus>("/account/deletion"),
  });
}
export function useRequestDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<DeletionStatus>("/account/deletion", json("POST")),
    onSuccess: (data) => qc.setQueryData(["deletion"], data),
  });
}
export function useCancelDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<DeletionStatus>("/account/deletion", json("DELETE")),
    onSuccess: (data) => qc.setQueryData(["deletion"], data),
  });
}

/** The community (Discord) link from runtime config; `null` hides every link to it. */
export function useCommunityUrl() {
  const q = useQuery({
    queryKey: ["public-config"],
    queryFn: async () =>
      (await (await fetch("/api/public-config")).json()) as { discordUrl: string | null },
    staleTime: 300_000,
  });
  return q.data?.discordUrl ?? null;
}

/** The company workspace this Microsoft sign-in may join, for the "Join?" prompt. */
export function useAutoJoinOffer() {
  return useQuery({
    queryKey: ["auto-join-offer"],
    queryFn: () =>
      call<{ offer: { tenantId: string; name: string } | null }>("/workspaces/auto-join"),
    staleTime: 300_000,
  });
}
export function useJoinCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ tenantId: string | null }>("/workspaces/auto-join", json("POST")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auto-join-offer"] }),
  });
}

export function useContactEmail() {
  return useQuery({
    queryKey: ["contact-email"],
    queryFn: () => call<ContactStatus>("/me/contact-email"),
    staleTime: 60_000,
  });
}
export function useRequestContactCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; locale: "en" | "ar" }) =>
      call<{ sent: true }>("/me/contact-email", json("POST", v)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-email"] }),
  });
}
export function useConfirmContactCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      call<{ email: string; verified: true }>("/me/contact-email/confirm", json("POST", { code })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-email"] }),
  });
}
