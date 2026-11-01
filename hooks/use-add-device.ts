"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { useLiveAuditFeed } from "@/hooks/use-live-audit-feed";
import type { Host } from "@/hooks/use-hosts";
import { newPendingHost, type StartMode } from "@/lib/personal/add-device";

/**
 * manar-api `POST /devices/install-code` and `PUT /workspace/start-mode` are newer than the
 * generated client (`pnpm api:codegen` adds them); until then these are typed fetches through the
 * same BFF. The BFF attaches the session token, so the browser never holds it.
 */
export interface InstallCode {
  code: string;
  installKeyId: string;
  expiresAt: string;
  windows: string;
  linux: string;
}

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly body: { code?: string; upgradeUrl?: string; message?: string },
  ) {
    super(body.message ?? `HTTP ${status}`);
  }
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) throw new ApiProblem(res.status, body as ApiProblem["body"]);
  return body as T;
}

/** One code per visit; asking again ("New code") makes another. */
export function useInstallCode() {
  return useQuery({
    queryKey: ["add-device", "install-code"],
    queryFn: () => call<InstallCode>("/devices/install-code", { method: "POST", body: "{}" }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useSetStartMode() {
  return useMutation({
    mutationFn: (mode: StartMode) =>
      call<unknown>("/workspace/start-mode", { method: "PUT", body: JSON.stringify({ mode }) }),
  });
}

/**
 * Watches for the device that runs the one-liner: the live feed's `host.registered` event
 * refreshes the list at once, and a 4 s poll covers a dropped stream.
 */
export function useWaitingDevice(installKeyId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const { events } = useLiveAuditFeed();
  const registered = events.some((e) => e.eventType === "host.registered");
  useEffect(() => {
    if (registered)
      void queryClient.invalidateQueries({ queryKey: ["add-device", "pending", installKeyId] });
  }, [registered, queryClient, installKeyId]);
  return useQuery({
    queryKey: ["add-device", "pending", installKeyId],
    enabled: enabled && installKeyId !== undefined,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/hosts", {
        params: { query: { status: "PENDING", limit: 20 } as never },
      });
      if (error) throw error;
      const items = (data as unknown as { items?: Host[] }).items ?? [];
      return newPendingHost(items, installKeyId) ?? null;
    },
  });
}
