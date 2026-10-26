import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useAddEgressRule,
  useAgentEdge,
  useEgressDecisions,
  useEgressRules,
  useRemoveEgressRule,
} from "@/hooks/use-edge";

/** The edge hooks call the BFF-backed client with the right routes and never swallow errors. */

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";

const GET = vi.mocked(apiClient.GET);
const POST = vi.mocked(apiClient.POST);
const DELETE = vi.mocked(apiClient.DELETE);

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  GET.mockReset();
  POST.mockReset();
  DELETE.mockReset();
});

describe("useAgentEdge", () => {
  it("reads GET /agents/{id}/edge for this agent", async () => {
    GET.mockResolvedValue({ data: { enrolled: false }, error: undefined } as never);
    const { result } = renderHook(() => useAgentEdge("agent-1", true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith("/agents/{id}/edge", { params: { path: { id: "agent-1" } } });
    expect(result.current.data).toEqual({ enrolled: false });
  });

  it("does not fetch when disabled (role check)", () => {
    renderHook(() => useAgentEdge("agent-1", false), { wrapper });
    expect(GET).not.toHaveBeenCalled();
  });

  it("surfaces an API error instead of a status", async () => {
    GET.mockResolvedValue({ data: undefined, error: { statusCode: 404 } } as never);
    const { result } = renderHook(() => useAgentEdge("agent-1", true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe("useEgressDecisions", () => {
  it("asks GET /audit for both decision event types and this agent only", async () => {
    GET.mockResolvedValue({ data: { items: [], nextCursor: null }, error: undefined } as never);
    const { result } = renderHook(() => useEgressDecisions("agent-1", true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith("/audit", {
      params: {
        query: {
          eventType: "agent.egress.allowed,agent.egress.denied",
          agentId: "agent-1",
          limit: 20,
        },
      },
    });
  });
});

describe("allow-list mutations", () => {
  it("add posts the body and refreshes the list", async () => {
    GET.mockResolvedValue({ data: { items: [] }, error: undefined } as never);
    POST.mockResolvedValue({ data: { id: "r-1" }, error: undefined } as never);
    const list = renderHook(() => useEgressRules("agent-1", true), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const { result } = renderHook(() => useAddEgressRule("agent-1"), { wrapper });
    act(() => result.current.mutate({ host: "api.example.com", reason: "x" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(POST).toHaveBeenCalledWith("/agents/{id}/egress-rules", {
      params: { path: { id: "agent-1" } },
      body: { host: "api.example.com", reason: "x" },
    });
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(2));
  });

  it("add keeps the API's error (status included) for the form", async () => {
    POST.mockResolvedValue({ data: undefined, error: { statusCode: 409 } } as never);
    const { result } = renderHook(() => useAddEgressRule("agent-1"), { wrapper });
    act(() => result.current.mutate({ host: "api.example.com" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ statusCode: 409 });
  });

  it("remove deletes the rule by id", async () => {
    DELETE.mockResolvedValue({ data: undefined, error: undefined } as never);
    const { result } = renderHook(() => useRemoveEgressRule("agent-1"), { wrapper });
    act(() => result.current.mutate("r-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(DELETE).toHaveBeenCalledWith("/agents/{id}/egress-rules/{ruleId}", {
      params: { path: { id: "agent-1", ruleId: "r-1" } },
    });
  });
});
