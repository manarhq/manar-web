/**
 * The friction flows in real Chromium against `next start` (run `pnpm build` first), with manar-api
 * replaced by e2e/friction-mock-api.mjs, which records every write it receives:
 *  - the rule offer on the approval card ("Approve and always allow this here")
 *  - the permissions list on Policies: real end date, named Withdraw, live-region announcement
 *  - learning: the switch, "what Manar saw this week", Accept with its duration note
 *  - the friction card, the chart with its table, RTL, and the nav entry
 *
 *   pnpm e2e
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { EncryptJWT } from "jose";
import { chromium } from "playwright";

const APP_PORT = Number(process.env.E2E_FRICTION_APP_PORT ?? 4320);
const API_PORT = Number(process.env.E2E_FRICTION_API_PORT ?? 4321);
const BASE = `http://127.0.0.1:${APP_PORT}`;
const API = `http://127.0.0.1:${API_PORT}`;
const SECRET = "00000000000000000000000000000000";

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
  return value.match(/.{1,3000}/g).map((c, i) => ({
    name: i === 0 ? "manar_session" : `manar_session.${i}`,
    value: c,
    url: BASE,
  }));
}

const procs = [];
function start(cmd, args, env) {
  procs.push(spawn(cmd, args, { env: { ...process.env, ...env }, stdio: "ignore" }));
}
async function waitFor(url) {
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`${url} did not come up`);
}
const writes = async () => (await fetch(`${API}/__calls`)).json();

let browser;
before(async () => {
  start("node", ["e2e/friction-mock-api.mjs"], { MOCK_API_PORT: String(API_PORT) });
  start("node_modules/.bin/next", ["start", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
    SESSION_SECRET: SECRET,
    MANAR_BFF_SERVICE_TOKEN: "0000000000000000",
    OIDC_CLIENT_SECRET: "0000000000000000",
    MANAR_API_BASE_URL: API,
    APP_BASE_URL: BASE,
    NODE_ENV: "production",
  });
  await waitFor(`${BASE}/api/health`);
  await waitFor(`${API}/__calls`);
  browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
});
after(async () => {
  await browser?.close();
  procs.forEach((p) => p.kill());
});

async function open(kind, path) {
  const context = await browser.newContext({ timezoneId: "UTC" });
  await context.addCookies(await sessionCookies(kind));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}${path}`);
  // The first-visit tour offer sits in the corner and would cover buttons: "Later".
  const offer = page.getByTestId("tour-offer");
  if (
    await offer.waitFor({ timeout: 3000 }).then(
      () => true,
      () => false,
    )
  )
    await offer.getByRole("button").nth(1).click();
  return { page, context, errors };
}

describe("friction flows", () => {
  it("the approval card offers 'Approve and always allow this here' and sends alwaysAllowHere", async () => {
    const { page, context, errors } = await open("COMPANY", "/en/approvals");
    const button = page.getByRole("button", { name: "Approve and always allow this here" });
    await button.waitFor({ timeout: 20_000 });
    assert.match(
      await page
        .getByText(/Lasts until/)
        .first()
        .innerText(),
      /Lasts until .*2027/,
    );
    await button.click();
    // The answer is held 10 seconds with Undo, then sent.
    for (let i = 0; i < 40; i++) {
      const sent = (await writes()).find((c) => c.path === "/host-approvals/a1/decide");
      if (sent) {
        assert.equal(sent.body.alwaysAllowHere, true);
        assert.equal(sent.body.decision, "approve_once");
        break;
      }
      assert.ok(i < 39, "the decision was never sent");
      await page.waitForTimeout(500);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("Policies lists permissions with the real end date and a named, announced Withdraw", async () => {
    const { page, context, errors } = await open("COMPANY", "/en/policies");
    const heading = page.getByRole("heading", { name: "Allowed without asking" });
    await heading.waitFor({ timeout: 20_000 });
    assert.equal(await page.getByText(/^Until .*2027$/).count(), 2);
    const withdraw = page.getByRole("button", {
      name: "Withdraw: Cursor edit in /home/sara/proj/src/*",
    });
    await withdraw.click();
    await page.getByRole("status").filter({ hasText: "Withdrawn:" }).waitFor();
    assert.ok(
      (await writes()).some((c) => c.path === "/approvals/allow-grants/g1/revoke"),
      "withdraw was not sent",
    );
    assert.equal(await withdraw.count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "grants-title");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("Rules shows the learning switch and what Manar saw; Accept states its duration first", async () => {
    const { page, context, errors } = await open("PERSONAL", "/en/rules");
    const sw = page.getByRole("switch", { name: "New devices learn first" });
    await sw.waitFor({ timeout: 20_000 });
    assert.equal(await sw.getAttribute("aria-checked"), "true");
    await page.getByRole("heading", { name: "Here is what Manar saw this week" }).waitFor();
    const row = page.locator("li", { hasText: "seen 9 times" });
    assert.match(await row.innerText(), /sara-laptop/);
    assert.match(await row.innerText(), /allowed on this device until .*2027/);
    assert.ok(
      await page
        .getByText(
          "While learning, Manar allows these actions and records them, so you can turn them into rules later.",
          { exact: false },
        )
        .first()
        .isVisible(),
    );
    await row.getByRole("button", { name: "Always allow this here" }).click();
    for (let i = 0; i < 20; i++) {
      if ((await writes()).some((c) => c.path === "/workspace/learning/suggestions/s1/accept"))
        break;
      assert.ok(i < 19, "accept was never sent");
      await page.waitForTimeout(250);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("Home shows the friction card; the page has a chart with a table, and a nav entry", async () => {
    const home = await open("PERSONAL", "/en/home");
    await home.page
      .getByRole("heading", { name: "How much Manar asked your team" })
      .waitFor({ timeout: 20_000 });
    assert.match(
      await home.page.getByText(/times today \(UTC\)/).innerText(),
      /Asked \d+ times today \(UTC\)/,
    );
    await home.page.getByRole("link", { name: "How much Manar asked you" }).first().waitFor();
    await home.context.close();

    const { page, context, errors } = await open("COMPANY", "/en/friction");
    await page
      .getByRole("img", { name: /Questions per day, oldest first/ })
      .waitFor({ timeout: 20_000 });
    assert.ok(await page.getByRole("columnheader", { name: "Not answered" }).first().isVisible());
    assert.ok(await page.getByText(/2 not answered in time/).isVisible());
    const days = await page
      .locator("table")
      .first()
      .locator("time")
      .evaluateAll((els) => els.map((e) => e.getAttribute("datetime")));
    assert.deepEqual(days, [...days].sort());
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("in Arabic the page is right to left and the chart is mirrored", async () => {
    const { page, context, errors } = await open("COMPANY", "/ar/friction");
    const chart = page.getByRole("img", { name: /الأسئلة في اليوم/ });
    await chart.waitFor({ timeout: 20_000 });
    assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
    assert.match((await chart.getAttribute("class")) ?? "", /rtl:-scale-x-100/);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
