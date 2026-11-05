"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LearningSetting } from "@/hooks/use-learning";
import type { ReportCardApi } from "@/lib/personal/report";
import { idempotencyHeader } from "@/lib/api/idempotency";

/** manar-api endpoints added by the features track. Called through the BFF; typed here until
 * `pnpm api:codegen` is run against a build that has them. */
async function bff<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...idempotencyHeader(init?.method),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
      code: body.code,
    });
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type StartMode = "watch" | "ask" | "strict";

export function useStartMode() {
  return useQuery({
    queryKey: ["start-mode"],
    queryFn: () =>
      bff<{ mode: StartMode | "custom"; learning?: LearningSetting }>("/workspace/start-mode"),
  });
}

/** Learning mode is part of the start-mode setting: new devices learn first, then the mode applies. */
export function useSetLearning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (learning: "on" | "off" | "default") =>
      bff<{ mode: StartMode | "custom"; learning: LearningSetting }>("/workspace/start-mode", {
        method: "PUT",
        body: JSON.stringify({ learning }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["start-mode"], data);
      void qc.invalidateQueries({ queryKey: ["learning"] });
    },
  });
}

export function useSetStartMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: StartMode) =>
      bff<{ mode: StartMode }>("/workspace/start-mode", {
        method: "PUT",
        body: JSON.stringify({ mode }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["start-mode"], data);
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

export function useReportCard() {
  return useQuery({
    queryKey: ["report-card"],
    queryFn: () => bff<ReportCardApi>("/workspace/report-card"),
    retry: false,
  });
}

/** The weekly card, or one agent session when a session id is given (insight track). */
export function useShareReport() {
  return useMutation({
    mutationFn: (sessionId?: string) =>
      bff<{ shareId: string }>(
        sessionId
          ? `/sessions/${encodeURIComponent(sessionId)}/share`
          : "/workspace/report-card/share",
        { method: "POST" },
      ),
  });
}

export function useRevokeShare() {
  return useMutation({
    mutationFn: (shareId: string) =>
      bff<void>(`/workspace/report-card/shares/${encodeURIComponent(shareId)}`, {
        method: "DELETE",
      }),
  });
}

export function useCreateSample() {
  return useMutation({
    mutationFn: () =>
      bff<{ tenantId: string; status: "ACTIVE" | "QUEUED" }>("/workspace/sample", {
        method: "POST",
      }),
  });
}

export function useDeleteSample() {
  return useMutation({ mutationFn: () => bff<void>("/workspace/sample", { method: "DELETE" }) });
}
