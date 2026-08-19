#!/usr/bin/env node
/**
 * A real-browser smoke check for the auth flow + Phase 11b Part 2's
 * core SOC pages, using `playwright` (a devDependency added this phase
 * specifically for this) against a running `pnpm start`/`pnpm dev`
 * instance and a real manar-api + Keycloak stack.
 *
 * This is NOT a CI-wired test suite — it needs a fully running local
 * stack (manar-api, Keycloak, a provisioned tenant + user) and, for the
 * page-content assertions, some already-seeded data (an agent/task/
 * policy matching the *_ID env vars below). It exists because a curl-
 * only verification pass cannot actually prove a client-rendered page
 * shows real data — see docs/auth-flow.md's cookie-chunking note, found
 * by exactly this script catching a login failure curl (no per-cookie
 * size limit) never could.
 *
 * Usage:
 *   MANAR_WEB_BASE_URL=http://localhost:4200 \
 *   TENANT_SLUG=manar-demo KEYCLOAK_USERNAME=demo-operator KEYCLOAK_PASSWORD=... \
 *   AGENT_ID=... TASK_ID=... APPROVAL_ID=... POLICY_ID=... TOKEN_TEST_AGENT_ID=... \
 *   node scripts/verify-e2e-smoke.mjs
 *
 * Every *_ID var is optional — that page's content assertions are
 * skipped (not failed) when its ID isn't provided, since this script has
 * no way to create that data itself (manar-api's own CLI/API are the
 * real way to seed it — see this phase's implementation notes).
 * TOKEN_TEST_AGENT_ID must be a PENDING_ENROLLMENT agent — enrollment-
 * token generation is destructive-ish UX-wise (a real one-time token) so
 * this script deliberately doesn't reuse an agent another check depends on.
 */
import { chromium } from "playwright";

const BASE = process.env.MANAR_WEB_BASE_URL ?? "http://localhost:4200";
const TENANT_SLUG = process.env.TENANT_SLUG ?? "manar-demo";
const USERNAME = process.env.KEYCLOAK_USERNAME ?? "demo-operator";
const PASSWORD = process.env.KEYCLOAK_PASSWORD;

if (!PASSWORD) {
  console.error("Set KEYCLOAK_PASSWORD (and ideally the other *_ID vars) before running this.");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto(`${BASE}/en/login`, { timeout: 15000 });
  await page.getByLabel(/workspace id/i).fill(TENANT_SLUG, { timeout: 15000 });
  await Promise.all([
    page.waitForURL(/realms\//, { timeout: 15000 }),
    page.getByRole("button", { name: /continue/i }).click(),
  ]);

  // Keycloak's own real login page — never one manar-web renders.
  await page.fill("#username", USERNAME, { timeout: 15000 });
  await page.fill("#password", PASSWORD, { timeout: 15000 });
  await Promise.all([
    page.waitForURL(new RegExp(BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { timeout: 15000 }),
    page.click("#kc-login", { timeout: 15000 }),
  ]);
  await page.waitForURL(/\/en\/overview/, { timeout: 15000 });
  console.log("login ok:", page.url());

  const results = {};
  async function checkPage(name, path, expectText = []) {
    consoleErrors.length = 0;
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const bodyText = await page.locator("body").innerText();
    results[name] = {
      url: page.url(),
      found: expectText.map((t) => [t, bodyText.includes(t)]),
      errors: [...consoleErrors],
    };
  }

  await checkPage("agents-list", "/en/agents", ["Agents"]);
  await checkPage("tasks-list", "/en/tasks", ["Tasks"]);
  await checkPage("approvals-list", "/en/approvals", ["Approvals"]);
  await checkPage("live", "/en/live", ["Live feed"]);
  await checkPage("tools-list", "/en/tools", ["Tools"]);
  await checkPage("policies-list", "/en/policies", ["Policies"]);
  await checkPage("audit-list", "/en/audit", ["Audit", "Verify chain", "Export evidence"]);

  if (process.env.AGENT_ID) {
    await checkPage("agent-detail", `/en/agents/${process.env.AGENT_ID}`, ["Identity"]);
  }
  if (process.env.TASK_ID) {
    await checkPage("task-detail", `/en/tasks/${process.env.TASK_ID}`, ["Overview"]);
  }
  if (process.env.APPROVAL_ID) {
    await checkPage("approval-detail", `/en/approvals/${process.env.APPROVAL_ID}`, []);
  }
  if (process.env.POLICY_ID) {
    await checkPage("policy-detail", `/en/policies/${process.env.POLICY_ID}`, ["Version history"]);
  }

  // RTL check.
  await page.goto(`${BASE}/ar/agents`, { waitUntil: "networkidle" });
  const dir = await page.locator("html").getAttribute("dir");
  const arBody = await page.locator("body").innerText();
  results.rtl = { dir, hasArabicText: /[؀-ۿ]/.test(arBody) };

  // Enrollment-token-shown-once check (only if a PENDING_ENROLLMENT
  // agent id was supplied).
  if (process.env.TOKEN_TEST_AGENT_ID) {
    const id = process.env.TOKEN_TEST_AGENT_ID;
    await page.goto(`${BASE}/en/agents/${id}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /generate enrollment token/i }).click();
    await page.waitForSelector("text=/one-time enrollment token/i", { timeout: 10000 });
    await page.waitForTimeout(800);
    // The raw token is rendered inside a <code> element — capture its
    // exact text so the re-navigation check looks for that specific
    // string, not just "any token-shaped string" (which could produce a
    // false pass/fail unrelated to whether *this* token reappeared).
    const tokenText = await page
      .locator("code")
      .filter({ hasText: /^[A-Za-z0-9:_-]{20,}$/ })
      .first()
      .innerText()
      .catch(() => null);
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/en/agents`, { waitUntil: "networkidle" });
    await page.goto(`${BASE}/en/agents/${id}`, { waitUntil: "networkidle" });
    const afterNavText = await page.locator("body").innerText();
    results.enrollmentTokenOnce = {
      shownOnGenerate: Boolean(tokenText),
      absentAfterRenavigate: tokenText ? !afterNavText.includes(tokenText) : null,
    };
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error("SMOKE_FAILED", error);
  process.exitCode = 1;
});
