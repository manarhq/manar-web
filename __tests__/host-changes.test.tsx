import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChangesTab } from "@/components/manar/hosts/changes-tab";
import { useHostChanges, useRestoreChange } from "@/hooks/use-host-changes";
import commonEn from "@/messages/en/common.json";
import hostsEn from "@/messages/en/hosts.json";

vi.mock("@/hooks/use-hosts", () => ({
  useHostsList: () => ({
    isPending: false,
    isError: false,
    data: {
      pages: [
        {
          items: [
            { id: "h-1", hostname: "pc-01", os: "Ubuntu" },
            { id: "h-2", hostname: "win-02", os: "Windows 11" },
          ],
        },
      ],
    },
  }),
}));

const change = (over = {}) => ({
  id: "c-1",
  tool: "claude-code",
  path: "/etc/hosts",
  existed: true,
  sizeBytes: 10,
  takenAt: "2026-11-01T10:00:00Z",
  expiresAt: "2026-11-08T10:00:00Z",
  restoreStatus: "NONE",
  restoreRequestedAt: null,
  restoreDoneAt: null,
  restoreNote: null,
  ...over,
});

let fetchMock: ReturnType<typeof vi.fn>;
let qc: QueryClient;
function wrap({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("host change hooks", () => {
  it("lists changes through the BFF for one device", async () => {
    fetchMock.mockReturnValue(json({ items: [change()] }));
    const { result } = renderHook(() => useHostChanges("h-1"), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/bff/hosts/h-1/changes");
    expect(result.current.data).toHaveLength(1);
  });

  it("does not query without a device", () => {
    renderHook(() => useHostChanges(""), { wrapper: wrap });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the restore and throws the API error body", async () => {
    fetchMock.mockReturnValueOnce(json({ id: "c-1" }, 201));
    const { result } = renderHook(() => useRestoreChange("h-1"), { wrapper: wrap });
    await act(() => result.current.mutateAsync("c-1"));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/bff/hosts/h-1/changes/c-1/restore");
    expect(fetchMock.mock.calls[0]![1].method).toBe("POST");
    fetchMock.mockReturnValueOnce(
      json({ statusCode: 409, message: "A restore is already waiting" }, 409),
    );
    await expect(result.current.mutateAsync("c-1")).rejects.toMatchObject({ statusCode: 409 });
  });
});

function view(canWrite: boolean) {
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ hosts: hostsEn, common: commonEn }}>
        <ChangesTab canWrite={canWrite} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ChangesTab", () => {
  it("shows the change and asks before restoring", async () => {
    fetchMock.mockReturnValue(
      json({
        items: [
          change(),
          change({ id: "c-2", existed: false, path: "/tmp/new.txt", restoreStatus: "RESTORED" }),
        ],
      }),
    );
    view(true);
    expect(await screen.findByText("/etc/hosts")).toBeTruthy();
    expect(screen.getByText("New file")).toBeTruthy();
    expect(screen.getByText("Restored")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]!);
    expect(screen.getByText("Put this file back?")).toBeTruthy();
    fetchMock.mockReturnValue(json({ id: "c-1" }, 201));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/changes/c-1/restore"))).toBe(
        true,
      ),
    );
  });

  it("offers no restore to a read-only role, and disables it while the device works", async () => {
    fetchMock.mockReturnValue(json({ items: [change({ restoreStatus: "REQUESTED" })] }));
    view(false);
    expect(await screen.findByText("Waiting for the device")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
  });

  it("says when there is nothing saved", async () => {
    fetchMock.mockReturnValue(json({ items: [] }));
    view(true);
    expect(await screen.findAllByText(hostsEn.changes.empty)).not.toHaveLength(0);
  });
});
