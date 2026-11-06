/**
 * Several console tabs over HTTP/1.1. A browser allows six connections per origin; when every tab
 * held its own live streams, four tabs used them all up and the console froze. Now a tab holds ONE
 * stream and only while it is visible. Counts what the mock API sees (`/__streams`), and checks a
 * fifth request still goes through.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCookies, startStack } from "./harness.mjs";

const stacks = [];
after(async () => {
  for (const s of stacks) await s.stop();
});

// Headless Chromium reports every tab as visible, so a tab "going to the background" is driven
// through the Page Visibility API (what a real browser does to a background tab).
const HIDE_HOOK = () => {
  window.__setHidden = (hidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };
};
const show = async (pages, front) => {
  await Promise.all(pages.map((p, i) => p.evaluate((h) => window.__setHidden(h), i !== front)));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const streamsOpen = async (s) => Number(await (await fetch(`${s.apiBase}/__streams`)).text());
const visibility = (pages) =>
  Promise.all(pages.map((p) => p.evaluate(() => document.visibilityState)));

async function until(check, ms = 8_000) {
  const end = Date.now() + ms;
  let value;
  while (Date.now() < end) {
    value = await check();
    if (value.ok) return value;
    await sleep(200);
  }
  return value;
}

describe("several console tabs", () => {
  it("hidden tabs hold no live stream, the visible tab holds exactly one, and a 5th request succeeds", async () => {
    const s = await startStack();
    stacks.push(s);
    const context = await s.browser.newContext();
    await context.addCookies(await sessionCookies(s.base, "COMPANY"));
    await context.addInitScript(HIDE_HOOK);

    // The approvals page (sync) and three overviews (sync + event counter): before the fix that
    // was up to eight streams for four tabs.
    const pages = [];
    for (const path of ["approvals", "overview", "overview", "overview"]) {
      const page = await context.newPage();
      await page.goto(`${s.base}/en/${path}`, { timeout: 15_000 });
      pages.push(page);
      await show(pages, pages.length - 1); // the newest tab is in front
    }
    const last = pages[pages.length - 1];

    const settled = await until(async () => {
      const states = await visibility(pages);
      const open = await streamsOpen(s);
      return { ok: states.filter((v) => v === "visible").length === 1 && open === 1, states, open };
    });
    assert.deepEqual(
      settled.states.map((v) => v === "visible"),
      [false, false, false, true],
      `only the front tab is visible: ${settled.states}`,
    );
    assert.equal(settled.open, 1, `4 tabs must hold 1 stream in total, held ${settled.open}`);

    // The 6-connection limit is far away: a request from another tab goes straight through.
    const probe = await last.evaluate(async () => {
      const ctl = new AbortController();
      setTimeout(() => ctl.abort(), 5_000);
      const r = await fetch("/api/bff/approvals?status=PENDING", { signal: ctl.signal });
      return r.status;
    });
    assert.equal(probe, 200);

    // Switching tabs moves the single stream with the user.
    await show(pages, 0);
    const moved = await until(async () => {
      const states = await visibility(pages);
      const open = await streamsOpen(s);
      return { ok: states[0] === "visible" && open === 1, states, open };
    });
    assert.equal(moved.open, 1, `after switching tabs, streams: ${moved.open}`);

    await context.close();
    const gone = await until(async () => ({ ok: (await streamsOpen(s)) === 0 }));
    assert.ok(gone.ok, "closing every tab closes every stream");
  });
});
