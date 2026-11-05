import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  approvalsPollInterval,
  backoffDelay,
  BACKOFF_MAX_MS,
  isApprovalEvent,
  RECONCILE_POLL_MS,
  startApprovalsStream,
} from "@/lib/live/approvals-stream";
import { canReadLiveFeed } from "@/lib/roles";

class FakeEventSource {
  static all: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) {
    FakeEventSource.all.push(this);
  }
  addEventListener(name: string, fn: (e: { data: string }) => void) {
    this.listeners[name] = fn;
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  /** The browser gave up (a non-200 response): readyState CLOSED. */
  refuse() {
    this.readyState = 2;
    this.onerror?.();
  }
  /** A network blip: the browser keeps retrying by itself (CONNECTING). */
  blip() {
    this.readyState = 0;
    this.onerror?.();
  }
  emit(eventType: string) {
    this.listeners["audit-event"]({ data: JSON.stringify({ eventType }) });
  }
}
const last = () => FakeEventSource.all[FakeEventSource.all.length - 1];

beforeEach(() => {
  FakeEventSource.all = [];
  vi.useFakeTimers();
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("approvals live stream", () => {
  it("only approval.* events count", () => {
    expect(isApprovalEvent("approval.requested")).toBe(true);
    expect(isApprovalEvent("tool.invoked")).toBe(false);
    expect(isApprovalEvent(undefined)).toBe(false);
  });

  it("polls every 15 s without a stream, slowly with one, and never across several pages", () => {
    expect(approvalsPollInterval(1)).toBe(15_000);
    expect(approvalsPollInterval(3)).toBe(false);
    const stop = startApprovalsStream({ onApproval: vi.fn(), onStatus: vi.fn() });
    last().open();
    expect(approvalsPollInterval(1)).toBe(RECONCILE_POLL_MS);
    last().refuse();
    expect(approvalsPollInterval(1)).toBe(15_000);
    stop();
  });

  it("serves several subscribers over one connection", () => {
    const a = { onApproval: vi.fn(), onStatus: vi.fn() };
    const b = { onApproval: vi.fn(), onStatus: vi.fn() };
    const stopA = startApprovalsStream(a);
    const stopB = startApprovalsStream(b);
    expect(FakeEventSource.all).toHaveLength(1);
    last().open();
    last().emit("approval.denied");
    last().emit("audit.x");
    expect([a.onApproval.mock.calls.length, b.onApproval.mock.calls.length]).toEqual([1, 1]);
    stopA();
    expect(last().closed).toBe(false); // b still listens
    stopB();
    expect(last().closed).toBe(true);
  });

  it("reports only real open/closed transitions, so a flapping API does not restart fast polling", () => {
    const h = { onApproval: vi.fn(), onStatus: vi.fn() };
    const stop = startApprovalsStream(h);
    last().open();
    expect(h.onStatus).toHaveBeenCalledTimes(1);
    last().blip();
    last().blip(); // still down: no second report
    expect(h.onStatus).toHaveBeenCalledTimes(2);
    last().open();
    expect(h.onStatus).toHaveBeenCalledTimes(3);
    stop();
  });

  it("reconnects itself after a refusal, with growing delays, and resets after opening", () => {
    const stop = startApprovalsStream({ onApproval: vi.fn(), onStatus: vi.fn() });
    last().refuse();
    expect(FakeEventSource.all).toHaveLength(1);
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.all).toHaveLength(2);
    last().refuse();
    vi.advanceTimersByTime(1_000); // second delay is 2 s at most 1 s to 2 s: not yet guaranteed
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.all).toHaveLength(3);
    last().open();
    last().refuse();
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.all).toHaveLength(4); // back to the first delay
    stop();
  });

  it("retries at once when the tab becomes visible again", () => {
    const stop = startApprovalsStream({ onApproval: vi.fn(), onStatus: vi.fn() });
    last().refuse();
    expect(FakeEventSource.all).toHaveLength(1);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(FakeEventSource.all).toHaveLength(2);
    stop();
  });

  it("backoff doubles, is capped, and keeps 50 to 100% jitter", () => {
    expect(backoffDelay(0, () => 1)).toBe(1_000);
    expect(backoffDelay(0, () => 0)).toBe(500);
    expect(backoffDelay(3, () => 1)).toBe(8_000);
    expect(backoffDelay(20, () => 1)).toBe(BACKOFF_MAX_MS);
  });
});

describe("who may subscribe", () => {
  it("only the roles manar-api lets open the live feed", () => {
    expect(canReadLiveFeed(["TENANT_OWNER"])).toBe(true);
    expect(canReadLiveFeed(["APPROVER", "AUDITOR"])).toBe(true);
    expect(canReadLiveFeed(["SECURITY_ADMIN"])).toBe(true);
    expect(canReadLiveFeed(["APPROVER", "SOC_OPERATOR", "DEVELOPER", "READ_ONLY"])).toBe(false);
    expect(canReadLiveFeed([])).toBe(false);
  });
});
