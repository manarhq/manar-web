// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.APP_BASE_URL = "http://localhost:3100";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));

const ISSUER = "http://kc.test/realms/manar";
let cookieStore: { get: (n: string) => { value: string } | undefined };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

let tokenCalls = 0;
let tokenReply: () => Response | Promise<Response>;
let apiReply: () => Promise<Response>;
let apiCalls: { signal?: AbortSignal; headers: Headers }[] = [];

beforeEach(async () => {
  vi.resetModules();
  tokenCalls = 0;
  apiCalls = [];
  tokenReply = () =>
    Response.json({ access_token: "new", refresh_token: "r2", expires_in: 300, token_type: "B" });
  apiReply = async () => Response.json({ ok: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/auth`,
          token_endpoint: `${ISSUER}/token`,
          jwks_uri: `${ISSUER}/certs`,
        });
      }
      if (url === `${ISSUER}/token`) {
        tokenCalls++;
        return tokenReply();
      }
      apiCalls.push({ signal: init?.signal ?? undefined, headers: new Headers(init?.headers) });
      return apiReply();
    }),
  );
  const { encryptSession } = await import("@/lib/auth/session");
  const value = await encryptSession({
    issuer: ISSUER,
    subject: "u1",
    accessToken: "old",
    refreshToken: "old-refresh",
    accessTokenExpiresAt: Date.now() - 60_000,
    refreshTokenExpiresAt: Date.now() + 600_000,
  });
  cookieStore = { get: (n) => (n === "manar_session" ? { value } : undefined) };
});

async function call(signal?: AbortSignal, path: string[] = ["hosts"]) {
  const { GET } = await import("@/app/api/bff/[...path]/route");
  const req = new NextRequest(`http://localhost:3100/api/bff/${path.join("/")}`, { signal });
  return GET(req, { params: Promise.resolve({ path }) });
}

describe("BFF session refresh failures", () => {
  it("an identity-provider 5xx answers 503 and keeps the session cookie", async () => {
    tokenReply = () => new Response("unavailable", { status: 503 });
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.getSetCookie().join("")).not.toMatch(/manar_session/);
  });

  it("a network error answers 503 and keeps the session cookie", async () => {
    tokenReply = () => {
      throw new TypeError("fetch failed");
    };
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.getSetCookie().join("")).not.toMatch(/manar_session/);
  });

  it("a 400 invalid_grant answers 401 and clears the cookie", async () => {
    tokenReply = () => Response.json({ error: "invalid_grant" }, { status: 400 });
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie().join("")).toMatch(/manar_session=;/);
  });

  it("parallel refreshes of one refresh token share a single token call", async () => {
    tokenReply = async () => {
      await new Promise((r) => setTimeout(r, 100));
      return Response.json({ access_token: "n", expires_in: 300, token_type: "B" });
    };
    await Promise.all([call(), call(), call()]);
    expect(tokenCalls).toBe(1);
  });
});

describe("BFF upstream timeouts", () => {
  let upstreamTimeoutMs: typeof import("@/lib/api/bff-request").upstreamTimeoutMs;
  beforeEach(async () => {
    ({ upstreamTimeoutMs } = await import("@/lib/api/bff-request"));
  });
  it("applies a 30 s default and a long ceiling only for long routes", async () => {
    expect(upstreamTimeoutMs(["hosts"])).toBe(30_000);
    for (const p of [
      ["audit", "investigate"],
      ["policies", "suggest"],
      ["events", "live"],
    ]) {
      expect(upstreamTimeoutMs(p)).toBe(600_000);
    }
  });

  it("caps the live stream at the access token's remaining life, so each reconnect re-checks the session", () => {
    const now = 1_000_000;
    expect(upstreamTimeoutMs(["events", "live"], now + 300_000, now)).toBe(300_000);
    expect(upstreamTimeoutMs(["events", "live"], now + 3_600_000, now)).toBe(600_000);
    expect(upstreamTimeoutMs(["events", "live"], now + 10, now)).toBe(1_000);
    expect(upstreamTimeoutMs(["events", "live"], undefined, now)).toBe(600_000);
    // Other long routes are not stream-capped.
    expect(upstreamTimeoutMs(["audit", "investigate"], now + 300_000, now)).toBe(600_000);
  });

  it("the route passes the refreshed token expiry into the events/live timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await call(undefined, ["events", "live"]); // token refreshed: expires_in 300 s
    const ms = timeout.mock.calls.at(-1)![0];
    expect(ms).toBeLessThanOrEqual(300_000);
    expect(ms).toBeGreaterThan(290_000);
    timeout.mockClear();
    await call(); // an ordinary route keeps the 30 s default
    expect(timeout.mock.calls.at(-1)![0]).toBe(30_000);
  });

  it("answers 504 when the upstream times out", async () => {
    apiReply = async () => {
      throw new DOMException("timed out", "TimeoutError");
    };
    expect((await call()).status).toBe(504);
  });

  it("a client abort is neither logged nor turned into a 502", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctl = new AbortController();
    apiReply = async () => {
      ctl.abort();
      throw new DOMException("aborted", "AbortError");
    };
    const res = await call(ctl.signal);
    expect(res.status).not.toBe(502);
    expect(err).not.toHaveBeenCalled();
  });
});

describe("BFF response headers", () => {
  it("never relays an upstream Set-Cookie, and sandboxes what it returns", async () => {
    apiReply = async () =>
      new Response("<script>alert(1)</script>", {
        headers: { "content-type": "text/html", "set-cookie": "evil=1; Path=/" },
      });
    const res = await call();
    expect(res.headers.get("set-cookie") ?? "").not.toContain("evil=1");
    expect(res.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
