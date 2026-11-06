/**
 * Approvals live updates: event-driven over the SSE stream, polling as the fallback. The mock API
 * holds one PENDING approval (or none), so polling has something real to find. Counts requests to
 * `/approvals?status=PENDING` (the waiting queue) and `/host-approvals`.
 * Ports are free ports, so these stacks can run next to the other e2e files.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCookies, startStack } from "./harness.mjs";

const QUIET_MS = 10_000;
const stacks = [];
const PENDING_URL = /\/api\/bff\/approvals\?status=PENDING/;

async function open(stack, { kind = "COMPANY", path = "approvals" } = {}) {
  const context = await stack.browser.newContext();
  await context.addCookies(await sessionCookies(stack.base, kind));
  const page = await context.newPage();
  const calls = [];
  const streamHits = [];
  page.on("request", (r) => {
    const url = r.url();
    if (/\/api\/bff\/(approvals|host-approvals)/.test(url)) calls.push(url);
    if (url.includes("/events/live")) streamHits.push(url);
  });
  await page.goto(`${stack.base}/en/${path}`);
  await page.waitForLoadState("networkidle");
  return { page, calls, streamHits };
}

const stack = async (mockEnv) => {
  const s = await startStack({ mockEnv });
  stacks.push(s);
  return s;
};

after(async () => {
  for (const s of stacks) await s.stop();
});

describe("approvals live updates", () => {
  it("polls nothing while the stream is open; an approval event refetches, others do not", async () => {
    const s = await stack({});
    const { page, calls } = await open(s);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(QUIET_MS);
    assert.equal(
      calls.length - settled,
      0,
      `polled while the stream was open: ${calls.slice(settled)}`,
    );

    await s.emit("audit.something");
    await page.waitForTimeout(800);
    assert.equal(calls.length - settled, 0, "a non-approval event must not refetch approvals");

    await s.emit("approval.requested");
    // Up to 6 s: the refetch is coalesced for 250 ms, and a busy machine can be slower than that.
    for (let i = 0; i < 30 && !calls.slice(settled).some((u) => PENDING_URL.test(u)); i++) {
      await page.waitForTimeout(200);
    }
    assert.ok(
      calls.slice(settled).some((u) => PENDING_URL.test(u)),
      "an approval event should refetch the queue",
    );
  });

  it("a role without the live feed never opens the stream and keeps polling the queue every 3 s", async () => {
    const s = await stack({ MOCK_ROLES: "APPROVER" });
    const { page, calls, streamHits } = await open(s);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(13_000); // about four 3 s ticks; a busy machine can slip one
    assert.deepEqual(streamHits, [], "no 403 probe for roles that cannot read the feed");
    const polls = calls.slice(settled).filter((u) => PENDING_URL.test(u)).length;
    assert.ok(polls >= 3, `expected 3 s polls of the waiting queue, saw ${polls}`);
    assert.ok(polls <= 6, `a role without a stream must not poll faster than 3 s, saw ${polls}`);
  });

  it("an APPROVER on /overview opens no stream either, and the queue is still polled every 3 s", async () => {
    const s = await stack({ MOCK_ROLES: "APPROVER" });
    const { page, calls, streamHits } = await open(s, { path: "overview" });
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(13_000);
    assert.deepEqual(streamHits, [], "the overview counter must not probe the feed");
    const polls = calls.slice(settled).filter((u) => PENDING_URL.test(u)).length;
    assert.ok(polls >= 3 && polls <= 6, `expected 3 s polls of the waiting queue, saw ${polls}`);
  });

  it("an empty queue still notices a new approval by polling (no pending item needed)", async () => {
    const s = await stack({ MOCK_ROLES: "APPROVER", MOCK_EMPTY_QUEUE: "1" });
    const { page, calls } = await open(s);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await fetch(`${s.apiBase}/__queue?pending=1`);
    await page.waitForTimeout(5_000);
    assert.ok(
      calls.slice(settled).some((u) => PENDING_URL.test(u)),
      "the waiting queue was never polled while empty",
    );
  });

  it("the approvals page asks the server for approval events only", async () => {
    const s = await stack({});
    const { streamHits } = await open(s);
    assert.ok(streamHits.length >= 1);
    assert.ok(
      streamHits.every((u) => u.includes("prefix=approval.")),
      `unfiltered stream on the approvals page: ${streamHits}`,
    );
  });

  it("a failing stream (503) is retried with backoff, and the queue is polled meanwhile", async () => {
    const s = await stack({ MOCK_EVENTS_LIVE: "503" });
    const { page, calls, streamHits } = await open(s);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(20_000);
    assert.ok(streamHits.length >= 3, `expected reconnect attempts, saw ${streamHits.length}`);
    assert.ok(streamHits.length <= 8, `reconnects must back off, saw ${streamHits.length}`);
    assert.ok(
      calls.slice(settled).some((u) => PENDING_URL.test(u)),
      "fallback poll missing",
    );
  });
});
