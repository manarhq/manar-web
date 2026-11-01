"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ReportCardApi } from "@/lib/personal/report";

/** manar-api endpoints added by the features track. Called through the BFF; typed here until
 * `pnpm api:codegen` is run against a build that has them. */
async function bff<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
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
    queryFn: () => bff<{ mode: StartMode | "custom" }>("/workspace/start-mode"),
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

export function useShareReport() {
  return useMutation({
    mutationFn: () => bff<{ shareId: string }>("/workspace/report-card/share", { method: "POST" }),
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
