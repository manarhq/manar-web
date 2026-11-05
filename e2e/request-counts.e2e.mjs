/**
 * Browser requests per page, measured in real Chromium against `next start` (run `pnpm build`
 * first) with manar-api replaced by e2e/mock-api.mjs. Counts what the browser sends to the BFF
 * (`/api/bff/*`): once while the page settles, then again after the tab regains focus.
 *
 *   pnpm e2e            # asserts the budgets below
 *   E2E_REPORT=1 pnpm e2e   # also prints the table
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { EncryptJWT } from "jose";
import { chromium } from "playwright";

const APP_PORT = Number(process.env.E2E_APP_PORT ?? 4310);
const API_PORT = Number(process.env.MOCK_API_PORT ?? 4311);
const BASE = `http://127.0.0.1:${APP_PORT}`;
const SECRET = "00000000000000000000000000000000";

const PAGES = [
  { kind: "COMPANY", path: "/en/overview" },
  { kind: "COMPANY", path: "/en/approvals" },
  { kind: "COMPANY", path: "/en/audit" },
  { kind: "COMPANY", path: "/en/hosts" },
  { kind: "PERSONAL", path: "/en/home" },
  { kind: "PERSONAL", path: "/en/activity" },
  { kind: "PERSONAL", path: "/en/sessions" },
];

async function sessionCookies(kind) {
  const startedAt = Date.now();
  const key = new Uint8Array(createHash("sha256").update(SECRET).digest());
  const value = await new EncryptJWT({
    issuer: "http://localhost/realms/manar",
    subject: "e2e-user",
    email: "e2e@example.test",
    displayName: "E2E",
    workspaceId: "ws-e2e",
    workspaceKind: kind,
    accessToken: "e2e-access",
    accessTokenExpiresAt: startedAt + 3_600_000,
    startedAt,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "manar-session+jwt" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(startedAt / 1000) + 3600)
    .encrypt(key);
  const chunks = value.match(/.{1,3000}/g);
  return chunks.map((c, i) => ({
    name: i === 0 ? "manar_session" : `manar_session.${i}`,
    value: c,
    url: BASE,
  }));
}

const procs = [];
function start(cmd, args, env) {
  const p = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: "ignore" });
  procs.push(p);
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`${url} did not come up`);
}

const results = [];
let browser;

before(async () => {
  start("node", ["e2e/mock-api.mjs"], { MOCK_API_PORT: String(API_PORT) });
  start("node_modules/.bin/next", ["start", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
    SESSION_SECRET: SECRET,
    MANAR_BFF_SERVICE_TOKEN: "0000000000000000",
    OIDC_CLIENT_SECRET: "0000000000000000",
    MANAR_API_BASE_URL: `http://127.0.0.1:${API_PORT}`,
    APP_BASE_URL: BASE,
    NODE_ENV: "production",
  });
  await waitFor(`${BASE}/api/health`);
  browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
});

after(async () => {
  await browser?.close();
  procs.forEach((p) => p.kill());
  if (process.env.E2E_REPORT) console.table(results);
});

describe("browser requests to the BFF per page", () => {
  for (const { kind, path } of PAGES) {
    it(`${path}`, async () => {
      const context = await browser.newContext();
      await context.addCookies(await sessionCookies(kind));
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
      // Only approvals and incidents may refetch on focus.
      const focusCalls = calls.slice(onLoad).filter((c) => !/ \/(approvals|incidents)$/.test(c));
      assert.deepEqual(focusCalls, [], "refetched on focus");
    });
  }
});
