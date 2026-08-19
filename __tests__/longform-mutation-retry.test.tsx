import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useSummarizeIncident } from "@/hooks/use-incident-summarize";
import { useInvestigateAudit } from "@/hooks/use-audit-investigate";
import { useSuggestPolicy } from "@/hooks/use-policies";

/**
 * Task 3 (task-3-brief.md): the three long-form AI mutations
 * (SummarizeIncident/InvestigateAudit/SuggestPolicy) must never retry a
 * failed call. Each of those RPCs can legitimately take up to
 * `AI_ADVISORY_LONGFORM_TIMEOUT_MS` (30s default), and their own circuit
 * breaker on the manar-api side trips after `AI_ADVISORY_LONGFORM_CIRCUIT_BREAKER_THRESHOLD`
 * (default 3) *consecutive* failures — so TanStack Query's own retry
 * logic, left at its library default, could trip that breaker off a
 * single slow-but-real request, and would also triple the operator's
 * wait (3 x 30s). This test proves each hook's `mutationFn` is invoked
 * exactly once when the underlying call fails, mirroring the QueryClient
 * this app's own `app/providers.tsx` constructs (no `mutations.retry`
 * override there either — the hooks must supply `retry: false`
 * themselves).
 */
vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";

const mockedPost = vi.mocked(apiClient.POST);

function wrapper({ children }: { children: ReactNode }) {
  // Mirrors app/providers.tsx's QueryClient construction: no
  // `defaultOptions.mutations` override, so this exercises the *real*
  // library default a caller would get if a hook didn't set its own
  // `retry: false`.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockedPost.mockReset();
});

describe("long-form AI mutation hooks do not retry", () => {
  it("useSummarizeIncident calls the API exactly once on failure", async () => {
    mockedPost.mockResolvedValue({ data: undefined, error: { message: "boom" } } as never);
    const { result } = renderHook(() => useSummarizeIncident(), { wrapper });

    act(() => {
      result.current.mutate("incident-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("useInvestigateAudit calls the API exactly once on failure", async () => {
    mockedPost.mockResolvedValue({ data: undefined, error: { message: "boom" } } as never);
    const { result } = renderHook(() => useInvestigateAudit(), { wrapper });

    act(() => {
      result.current.mutate({ question: "why?", filters: {} as never });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("useSuggestPolicy calls the API exactly once on failure", async () => {
    mockedPost.mockResolvedValue({ data: undefined, error: { message: "boom" } } as never);
    const { result } = renderHook(() => useSuggestPolicy(), { wrapper });

    act(() => {
      result.current.mutate({
        naturalLanguageDescription: "test",
        policyName: "test policy",
      } as never);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});
