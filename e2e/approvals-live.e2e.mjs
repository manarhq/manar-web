/**
 * Approvals live updates: event-driven over the SSE stream with polling only as the fallback.
 * The mock API keeps one PENDING approval, so the old code polled it every 3 s for as long as the
 * page was open. Counts `/approvals?status=PENDING` and `/host-approvals` over a quiet window.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCookies, startStack } from "./harness.mjs";

const WINDOW_MS = 10_000;
const FALLBACK_WINDOW_MS = 34_000; // two 15 s fallback polls
const stacks = [];

async function open(stack) {
  const context = await stack.browser.newContext();
  await context.addCookies(await sessionCookies(stack.base, "COMPANY"));
  const page = await context.newPage();
  const calls = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (/\/api\/bff\/(approvals|host-approvals)/.test(u.pathname))
      calls.push(`${Math.round(performance.now() / 1000)}s ${u.pathname}${u.search}`);
  });
  await page.goto(`${stack.base}/en/overview`);
  await page.waitForLoadState("networkidle");
  return { page, calls, context };
}

after(async () => {
  for (const s of stacks) await s.stop();
});

describe("approvals live updates", () => {
  it("polls nothing while the stream is open, and refetches when an approval event arrives", async () => {
    const stack = await startStack({ appPort: 4330, apiPort: 4331 });
    stacks.push(stack);
    const { page, calls } = await open(stack);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(WINDOW_MS);
    assert.equal(
      calls.length - settled,
      0,
      `polled while the stream was open: ${calls.slice(settled)}`,
    );

    await stack.emit("audit.something");
    await page.waitForTimeout(800);
    assert.equal(calls.length - settled, 0, "a non-approval event must not refetch approvals");

    await stack.emit("approval.requested");
    await page.waitForTimeout(1200);
    assert.ok(calls.length - settled >= 1, "an approval event should refetch approvals");
  });

  it("falls back to polling when the stream is refused (an approver without audit access)", async () => {
    const stack = await startStack({
      appPort: 4332,
      apiPort: 4333,
      mockEnv: { MOCK_EVENTS_LIVE: "403" },
    });
    stacks.push(stack);
    const { page, calls } = await open(stack);
    await page.waitForTimeout(1500);
    const settled = calls.length;
    await page.waitForTimeout(FALLBACK_WINDOW_MS);
    const polls = calls.length - settled;
    assert.ok(
      polls >= 2,
      `expected the 15 s fallback poll, saw ${polls} requests in ${FALLBACK_WINDOW_MS} ms`,
    );
  });
});
