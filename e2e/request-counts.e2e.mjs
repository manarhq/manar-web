/**
 * Browser requests per page, measured in real Chromium against `next start` (run `pnpm build`
 * first) with manar-api replaced by e2e/mock-api.mjs. Counts what the browser sends to the BFF
 * (`/api/bff/*`): once while the page settles, then again after the tab regains focus.
 *
 *   pnpm e2e            # asserts the budgets below
 *   E2E_REPORT=1 pnpm e2e   # also prints the table
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCookies, startStack } from "./harness.mjs";

const PAGES = [
  { kind: "COMPANY", path: "/en/overview" },
  { kind: "COMPANY", path: "/en/approvals" },
  { kind: "COMPANY", path: "/en/audit" },
  { kind: "COMPANY", path: "/en/hosts" },
  { kind: "PERSONAL", path: "/en/home" },
  { kind: "PERSONAL", path: "/en/activity" },
  { kind: "PERSONAL", path: "/en/sessions" },
];

const results = [];
let stack;
let BASE;
let browser;

before(async () => {
  stack = await startStack();
  ({ base: BASE, browser } = stack);
});

after(async () => {
  await stack?.stop();
  if (process.env.E2E_REPORT) console.table(results);
});

describe("browser requests to the BFF per page", () => {
  for (const { kind, path } of PAGES) {
    it(`${path}`, async () => {
      const context = await browser.newContext();
      await context.addCookies(await sessionCookies(BASE, kind));
      // Lets the test age every cached query by two minutes without waiting for it.
      await context.addInitScript(() => {
        const now = Date.now.bind(Date);
        window.__skew = 0;
        Date.now = () => now() + window.__skew;
      });
      const page = await context.newPage();
      const calls = [];
      page.on("request", (r) => {
        const u = new URL(r.url());
        if (u.pathname.startsWith("/api/bff/") && !u.pathname.includes("/events/live"))
          calls.push(`${r.method()} ${u.pathname.replace("/api/bff", "")}`);
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      // A render error caught by an error boundary only shows up here, and would hide the page's queries.
      page.on(
        "console",
        (m) => m.type() === "error" && /TypeError|Error:/.test(m.text()) && errors.push(m.text()),
      );

      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      const onLoad = calls.length;

      // The operator comes back to the tab two minutes later.
      await page.evaluate(() => {
        window.__skew = 120_000;
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          configurable: true,
        });
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
      });
      await page.waitForTimeout(1000);
      const afterFocus = calls.length - onLoad;

      results.push({ page: path, onLoad, afterFocus, paths: [...new Set(calls)].join(" ") });
      await context.close();

      assert.deepEqual(errors, [], "page threw");
      // The command palette is mounted on every page; closed, it must not fetch its five lists.
      if (kind === "COMPANY")
        for (const list of ["/tasks", "/tools", "/policies"])
          assert.ok(
            !calls.some((c) => c.includes(` ${list}`)),
            `palette fetched ${list}: ${calls}`,
          );
      // Only security-relevant (live) queries may refetch on focus: lib/api/query-freshness.ts.
      const focusCalls = calls
        .slice(onLoad)
        .filter(
          (c) =>
            !/ \/(approvals|incidents|agents|tasks|policies|tools|users|hosts|host-approvals|workspace\/pause|host-groups|org-units|install-keys|host-approval-rules|secrets\/[a-z]+)(\?|$)/.test(
              c,
            ),
        );
      assert.deepEqual(focusCalls, [], `refetched on focus: ${focusCalls}`);
    });
  }
});
