#!/usr/bin/env node
/**
 * Real-browser check of the suspended page and the appeal (DESK spec 9.2, 9.4), like
 * verify-e2e-smoke.mjs: not wired into CI, it needs a running manar-web, manar-api with the staff
 * module, Keycloak, and a customer that staff restricted.
 *
 * Usage:
 *   MANAR_WEB_BASE_URL=http://localhost:3412 KEYCLOAK_USERNAME=... KEYCLOAK_PASSWORD=... \
 *   SCREENSHOT_DIR=... node scripts/verify-suspended.mjs
 *
 * Turnstile uses Cloudflare's always-pass test keys outside production (site key in manar-web,
 * secret in manar-api), so the browser needs to reach challenges.cloudflare.com.
 */
import { chromium } from "playwright";

const base = process.env.MANAR_WEB_BASE_URL ?? "http://localhost:4200";
const user = process.env.KEYCLOAK_USERNAME;
const pass = process.env.KEYCLOAK_PASSWORD;
const shots = process.env.SCREENSHOT_DIR;
if (!user || !pass) throw new Error("KEYCLOAK_USERNAME and KEYCLOAK_PASSWORD are required");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const step = (m) => console.log(`- ${m}`);
try {
  await page.goto(`${base}/en/login`);
  await page.getByRole("button").first().click();
  await page.waitForURL(/\/realms\//);
  await page.fill("#username", user);
  await page.fill("#password", pass);
  await page.click("#kc-login");
  await page.waitForURL(/\/en\/suspended/, { timeout: 30_000 });
  step("a suspended person lands on /suspended after sign-in");
  await page.getByTestId("suspended-title").waitFor();
  const category = await page.getByTestId("suspended-category").textContent();
  step(`it shows the reason category: ${category}`);
  if (shots) await page.screenshot({ path: `${shots}/console-suspended-en.png` });
  await page
    .getByTestId("appeal-text")
    .fill("I run a small agency and created workspaces for three real clients.");
  await page.getByTestId("appeal-submit").waitFor();
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="appeal-submit"]')?.hasAttribute("disabled"),
    null,
    { timeout: 30_000 },
  );
  step("Send is enabled once Turnstile passes");
  await page.getByTestId("appeal-submit").click();
  await page.getByTestId("appeal-received").waitFor({ timeout: 15_000 });
  step(
    `the appeal is received: ${(await page.getByTestId("appeal-received").textContent())?.trim()}`,
  );
  if (shots) await page.screenshot({ path: `${shots}/console-suspended-appeal-received.png` });
  await page.goto(`${base}/ar/suspended`);
  await page.getByTestId("suspended-title").waitFor();
  if (shots) await page.screenshot({ path: `${shots}/console-suspended-ar.png` });
  step("the Arabic page renders");
  console.log("PASS");
} catch (e) {
  if (shots) await page.screenshot({ path: `${shots}/console-suspended-failure.png` });
  console.error("FAIL", e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
