import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAllowGrants } from "@/hooks/use-allow-grants";

const bff = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/raw", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/raw")>()),
  bffJson: bff,
}));
afterEach(() => bff.mockReset());

describe("permissions are security state", () => {
  it("are never served from a timer: a second mount reads again", async () => {
    bff.mockResolvedValue({ items: [] });
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
    const wrap = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const a = renderHook(() => useAllowGrants(), { wrapper: wrap });
    await waitFor(() => expect(a.result.current.data).toBeDefined());
    renderHook(() => useAllowGrants(), { wrapper: wrap });
    await waitFor(() => expect(bff).toHaveBeenCalledTimes(2));
  });
});
