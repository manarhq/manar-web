import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInstallCode } from "@/hooks/use-add-device";
import { apiClient } from "@/lib/api/client";
import { idempotencyHeader } from "@/lib/api/idempotency";

vi.mock("@/hooks/use-live-audit-feed", () => ({ useLiveAuditFeed: () => ({ events: [] }) }));

afterEach(() => vi.unstubAllGlobals());

describe("Idempotency-Key", () => {
  it("is a fresh UUID for mutations and absent for reads", () => {
    const a = idempotencyHeader("POST")["Idempotency-Key"];
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(idempotencyHeader("patch")["Idempotency-Key"]).not.toBe(a);
    expect(idempotencyHeader("GET")).toEqual({});
    expect(idempotencyHeader()).toEqual({});
  });

  it("is sent by the generated client on a mutation", async () => {
    const seen: Request[] = [];
    const fetch = async (r: Request) => (
      seen.push(r),
      new Response("{}", { headers: { "content-type": "application/json" } })
    );
    const c = apiClient as unknown as {
      POST: (p: string, o: object) => Promise<unknown>;
      GET: (p: string, o: object) => Promise<unknown>;
    };
    await c.POST("/webhooks", { baseUrl: "http://t", fetch, body: {} });
    await c.GET("/hosts", { baseUrl: "http://t", fetch });
    expect(seen[0]!.headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(seen[1]!.headers.get("idempotency-key")).toBeNull();
  });

  it("useInstallCode mints exactly one code, with a key, and does not refetch", async () => {
    const fetchMock = vi.fn(
      async (_u: string, _i: RequestInit) =>
        new Response(JSON.stringify({ code: "C", installKeyId: "k" })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useInstallCode(), { wrapper });
    await waitFor(() => expect(result.current.data?.code).toBe("C"));
    await qc.refetchQueries();
    window.dispatchEvent(new Event("online"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeTruthy();
  });
});
