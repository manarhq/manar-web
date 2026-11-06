import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveFeedAccessProvider } from "@/components/manar/live/live-feed-access";
import { useLiveAuditFeed } from "@/hooks/use-live-audit-feed";
import { useLiveEventCount } from "@/hooks/use-live-event-count";
import { approvalsPollInterval } from "@/lib/live/approvals-stream";

const sources: { url: string; close: () => void }[] = [];
class FakeEventSource {
  onopen = null;
  onerror = null;
  readyState = 0;
  constructor(public url: string) {
    sources.push(this);
  }
  addEventListener() {}
  close() {
    this.readyState = 2;
  }
}

beforeEach(() => {
  sources.length = 0;
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => vi.unstubAllGlobals());

function wrap(allowed: boolean) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <LiveFeedAccessProvider allowed={allowed}>{children}</LiveFeedAccessProvider>;
  }
  return Wrapper;
}

describe("roles the live feed refuses never open a stream", () => {
  it("an APPROVER on /overview or /live opens nothing and the approvals still poll at 3 s", () => {
    const a = renderHook(() => useLiveEventCount(), { wrapper: wrap(false) });
    const b = renderHook(() => useLiveAuditFeed(), { wrapper: wrap(false) });
    expect(sources).toHaveLength(0);
    expect(approvalsPollInterval(1)).toBe(3_000);
    expect(approvalsPollInterval(1, 5_000, 2_000)).toBe(2_000);
    a.unmount();
    b.unmount();
  });

  it("a role that may read the feed opens one stream for both hooks", () => {
    const a = renderHook(() => useLiveEventCount(), { wrapper: wrap(true) });
    const b = renderHook(() => useLiveAuditFeed(), { wrapper: wrap(true) });
    expect(sources).toHaveLength(1);
    a.unmount();
    b.unmount();
  });
});
