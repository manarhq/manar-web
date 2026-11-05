import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approvalsPollInterval,
  isApprovalEvent,
  startApprovalsStream,
  RECONCILE_POLL_MS,
} from "@/lib/live/approvals-stream";

class FakeEventSource {
  static last: FakeEventSource;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(name: string, fn: (e: { data: string }) => void) {
    this.listeners[name] = fn;
  }
  close() {
    this.closed = true;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("approvals live stream", () => {
  it("only approval.* events count", () => {
    expect(isApprovalEvent("approval.requested")).toBe(true);
    expect(isApprovalEvent("tool.invoked")).toBe(false);
    expect(isApprovalEvent(undefined)).toBe(false);
  });

  it("polls every 15 s without a stream, slowly with one, and never across several pages", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    expect(approvalsPollInterval(1)).toBe(15_000);
    expect(approvalsPollInterval(3)).toBe(false);
    const onStatus = vi.fn();
    const onApproval = vi.fn();
    const stop = startApprovalsStream({ onApproval, onStatus });
    const es = FakeEventSource.last;
    es.onopen!();
    expect(approvalsPollInterval(1)).toBe(RECONCILE_POLL_MS);
    es.listeners["audit-event"]({ data: JSON.stringify({ eventType: "approval.denied" }) });
    es.listeners["audit-event"]({ data: JSON.stringify({ eventType: "audit.x" }) });
    es.listeners["audit-event"]({ data: "not json" });
    expect(onApproval).toHaveBeenCalledTimes(1);
    es.onerror!(); // a refused or dropped stream hands back to polling
    expect(approvalsPollInterval(1)).toBe(15_000);
    expect(onStatus).toHaveBeenCalledTimes(2);
    stop();
    expect(es.closed).toBe(true);
  });
});
