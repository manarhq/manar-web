import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCreateInstallKey, useHostDecision, useHostsList } from "@/hooks/use-hosts";

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));
import { apiClient } from "@/lib/api/client";

const GET = vi.mocked(apiClient.GET);
const POST = vi.mocked(apiClient.POST);

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  GET.mockReset();
  POST.mockReset();
});

describe("useHostsList", () => {
  it("passes the filters and the cursor, and omits an empty filter", async () => {
    GET.mockResolvedValue({ data: { items: [], nextCursor: null } } as never);
    const { result } = renderHook(() => useHostsList({ status: "PENDING", hostGroupId: "" }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith("/hosts", {
      params: {
        query: { status: "PENDING", hostGroupId: undefined, limit: 50, cursor: undefined },
      },
    });
  });
});

describe("useHostDecision", () => {
  it("posts the exact fingerprint for a rekey approval", async () => {
    POST.mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useHostDecision(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ id: "h1", decision: "approve", keyFingerprint: "a".repeat(64) }),
    );
    expect(POST).toHaveBeenCalledWith("/hosts/{id}/approve", {
      params: { path: { id: "h1" } },
      body: { keyFingerprint: "a".repeat(64) },
    });
  });

  it("sends an empty body when there is no fingerprint, and throws API errors", async () => {
    POST.mockResolvedValue({ error: { statusCode: 409, message: "no" } } as never);
    const { result } = renderHook(() => useHostDecision(), { wrapper });
    await expect(result.current.mutateAsync({ id: "h1", decision: "revoke" })).rejects.toEqual({
      statusCode: 409,
      message: "no",
    });
    expect(POST).toHaveBeenCalledWith("/hosts/{id}/revoke", {
      params: { path: { id: "h1" } },
      body: {},
    });
  });
});

describe("useCreateInstallKey", () => {
  it("is not kept in the mutation cache after it settles", async () => {
    POST.mockResolvedValue({ data: { id: "k1", installKey: "mik_t_secret" } } as never);
    const { result } = renderHook(() => useCreateInstallKey(), { wrapper });
    await act(() => result.current.mutateAsync({ hostGroupId: "g", label: "x" }));
    act(() => result.current.reset());
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0));
  });
});
