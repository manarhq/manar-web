import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { EncryptJWT } from "jose";
import { chromium } from "playwright";

export const SECRET = "00000000000000000000000000000000";

export async function sessionCookies(base, kind) {
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
    url: base,
  }));
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

/** A free TCP port, so stacks started by parallel test files never collide. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Starts the mock API and `next start` on the given ports; returns the browser and a stop function. */
export async function startStack({ appPort, apiPort, mockEnv = {} } = {}) {
  appPort ??= await freePort();
  apiPort ??= await freePort();
  const base = `http://127.0.0.1:${appPort}`;
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const procs = [];
  const start = (cmd, args, env) =>
    procs.push(spawn(cmd, args, { env: { ...process.env, ...env }, stdio: "ignore" }));
  start("node", ["e2e/mock-api.mjs"], { MOCK_API_PORT: String(apiPort), ...mockEnv });
  start("node_modules/.bin/next", ["start", "-p", String(appPort), "-H", "127.0.0.1"], {
    SESSION_SECRET: SECRET,
    MANAR_BFF_SERVICE_TOKEN: "0000000000000000",
    OIDC_CLIENT_SECRET: "0000000000000000",
    MANAR_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
    APP_BASE_URL: base,
    NODE_ENV: "production",
  });
  await waitFor(`${base}/api/health`);
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
  return {
    base,
    apiBase,
    browser,
    /** Pushes an audit event of this type to every open live stream (see mock-api.mjs). */
    emit: (type) => fetch(`${apiBase}/__emit?type=${type}`),
    async stop() {
      await browser.close();
      procs.forEach((p) => p.kill());
    },
  };
}
