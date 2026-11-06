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
  it("applies a 30 s default, 95 s to the plain AI routes (under Cloudflare's 100 s) and no total limit to streams", async () => {
    expect(upstreamTimeoutMs(["hosts"])).toBe(30_000);
    for (const p of [
      ["audit", "investigate"],
      ["policies", "suggest"],
      ["incidents", "summarize"],
      ["assistant", "chat"],
    ]) {
      expect(upstreamTimeoutMs(p)).toBe(95_000);
    }
    for (const p of [
      ["assistant", "chat", "stream"],
      ["audit", "investigate", "stream"],
      ["incidents", "summarize", "stream"],
      ["policies", "suggest", "jobs", "7d1c0f0e-0000-4000-8000-000000000000", "events"],
      ["events", "live"],
    ]) {
      expect(upstreamTimeoutMs(p)).toBeNull();
    }
  });

  it("no route waits 600 s any more", async () => {
    for (const p of [["hosts"], ["audit", "investigate"], ["policies", "suggest"]]) {
      expect(upstreamTimeoutMs(p) ?? 0).toBeLessThanOrEqual(95_000);
    }
  });

  it("caps the live stream at the access token's remaining life, so each reconnect re-checks the session", () => {
    const now = 1_000_000;
    expect(upstreamTimeoutMs(["events", "live"], now + 300_000, now)).toBe(300_000);
    expect(upstreamTimeoutMs(["events", "live"], now + 3_600_000, now)).toBe(3_600_000);
    expect(upstreamTimeoutMs(["events", "live"], now + 10, now)).toBe(1_000);
    expect(upstreamTimeoutMs(["events", "live"], undefined, now)).toBeNull();
    // Other streams and routes are not token-capped.
    expect(upstreamTimeoutMs(["assistant", "chat", "stream"], now + 300_000, now)).toBeNull();
    expect(upstreamTimeoutMs(["hosts"], now + 300_000, now)).toBe(30_000);
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

describe("BFF streaming pass-through", () => {
  async function stream(path: string[]) {
    const { POST } = await import("@/app/api/bff/[...path]/route");
    const req = new NextRequest(`http://localhost:3100/api/bff/${path.join("/")}`, {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json", origin: "http://localhost:3100" },
    });
    return POST(req, { params: Promise.resolve({ path }) });
  }

  it("relays an event stream chunk by chunk, before the upstream has finished", async () => {
    let finish!: () => void;
    const enc = new TextEncoder();
    apiReply = async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode('event: delta\ndata: {"t":"Hel"}\n\n'));
            finish = () => {
              c.enqueue(enc.encode("event: done\ndata: {}\n\n"));
              c.close();
            };
          },
        }),
        { headers: { "content-type": "text/event-stream", "content-encoding": "gzip" } },
      );
    const res = await stream(["assistant", "chat", "stream"]);
    const reader = res.body!.getReader();
    const first = await reader.read(); // arrives while the upstream is still open
    expect(new TextDecoder().decode(first.value)).toContain('"t":"Hel"');
    finish();
    const rest = await reader.read();
    expect(new TextDecoder().decode(rest.value)).toContain("event: done");
  });

  it("marks a stream uncompressible and unbuffered, and drops the upstream's content-encoding", async () => {
    apiReply = async () =>
      new Response("event: done\ndata: {}\n\n", {
        headers: {
          "content-type": "text/event-stream",
          "content-encoding": "gzip",
          "cache-control": "public, max-age=60",
        },
      });
    const res = await stream(["incidents", "summarize", "stream"]);
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("gives a stream no total timeout, only the browser going away ends it", async () => {
    await stream(["audit", "investigate", "stream"]);
    const signal = apiCalls.at(-1)!.signal!;
    // A plain call carries an AbortSignal.timeout; a stream's signal is the request's own.
    const plain = async () => {
      const { GET } = await import("@/app/api/bff/[...path]/route");
      await GET(new NextRequest("http://localhost:3100/api/bff/hosts"), {
        params: Promise.resolve({ path: ["hosts"] }),
      });
      return apiCalls.at(-1)!.signal!;
    };
    expect(signal.aborted).toBe(false);
    const timed = await plain();
    expect(timed).not.toBe(signal);
  });

  it("does not add stream headers to ordinary JSON", async () => {
    const res = await call();
    expect(res.headers.get("x-accel-buffering")).toBeNull();
  });
});
