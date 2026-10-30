// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.APP_BASE_URL = "http://localhost:3100";
});
vi.mock("server-only", () => ({}));

const ISSUER = "http://kc.test/realms/manar";
let tokenCalls: string[] = [];
let tokenBehaviour: "rotate" | "fail" = "rotate";

beforeEach(() => {
  vi.resetModules();
  tokenCalls = [];
  tokenBehaviour = "rotate";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/auth`,
          token_endpoint: `${ISSUER}/token`,
          jwks_uri: `${ISSUER}/certs`,
        });
      }
      if (url === `${ISSUER}/token`) {
        const body = new URLSearchParams(String(init?.body));
        tokenCalls.push(body.get("refresh_token") ?? "");
        if (tokenBehaviour === "fail") return new Response("invalid_grant", { status: 400 });
        return Response.json({
          access_token: "new-access",
          refresh_token: "rotated-refresh",
          expires_in: 300,
          refresh_expires_in: 1800,
          token_type: "Bearer",
        });
      }
      return new Response("nf", { status: 404 });
    }),
  );
});

async function expiredSessionCookie() {
  const { encryptSession, setSessionCookie } = await import("@/lib/auth/session");
  const value = await encryptSession({
    issuer: ISSUER,
    subject: "u1",
    workspaceId: "t1",
    accessToken: "old-access",
    refreshToken: "old-refresh",
    accessTokenExpiresAt: Date.now() - 60_000,
    refreshTokenExpiresAt: Date.now() + 600_000,
  });
  const pairs: string[] = [];
  setSessionCookie({ set: (n, v) => pairs.push(`${n}=${v}`) }, value, {});
  return pairs.join("; ");
}

async function navigate(cookie: string) {
  const { default: proxy } = await import("@/proxy");
  return proxy(new NextRequest("http://localhost:3100/en/home", { headers: { cookie } }));
}

describe("session refresh happens where the cookie can be stored", () => {
  it("a navigation with an expired access token refreshes once and stores the ROTATED refresh token", async () => {
    const response = await navigate(await expiredSessionCookie());
    expect(tokenCalls).toEqual(["old-refresh"]);
    const setCookie = response.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/manar_session=/);

    // Read back what the browser would now send: the rotated refresh token, not the old one.
    const { decryptSession, readSessionCookieValue } = await import("@/lib/auth/session");
    const stored = new Map<string, { value: string }>();
    for (const c of response.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [name, ...rest] = pair!.split("=");
      stored.set(name!, { value: rest.join("=") });
    }
    const session = await decryptSession(readSessionCookieValue({ get: (n) => stored.get(n) })!);
    expect(session).toMatchObject({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      workspaceId: "t1",
    });
    expect(response.status).not.toBe(307);
  });

  it("a refresh the identity provider refuses ends the session instead of looping", async () => {
    tokenBehaviour = "fail";
    const response = await navigate(await expiredSessionCookie());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/en/login");
  });

  it("Server Components never refresh: an expired token is simply not usable", async () => {
    const { freshAccessToken } = await import("@/lib/auth/token.server");
    const base = {
      issuer: ISSUER,
      subject: "u1",
      accessToken: "a",
      refreshToken: "r",
      accessTokenExpiresAt: Date.now() - 1,
    };
    expect(freshAccessToken(base)).toBeNull();
    expect(freshAccessToken({ ...base, accessTokenExpiresAt: Date.now() + 120_000 })).toBe("a");
    expect(tokenCalls).toEqual([]);
  });
});

describe("linking never attaches an email address", () => {
  it("has no email action", async () => {
    const { POST } = await import("@/app/api/auth/link/route");
    const { encryptSession, setSessionCookie } = await import("@/lib/auth/session");
    const value = await encryptSession({
      issuer: ISSUER,
      subject: "u1",
      accessToken: "a",
      accessTokenExpiresAt: Date.now() + 60_000,
    });
    const pairs: string[] = [];
    setSessionCookie({ set: (n, v) => pairs.push(`${n}=${v}`) }, value, {});
    const response = await POST(
      new NextRequest("http://localhost:3100/api/auth/link", {
        method: "POST",
        body: new URLSearchParams({ method: "email", locale: "en" }),
        headers: { cookie: pairs.join("; ") },
      }),
    );
    expect(response.headers.get("location")).toContain("error=linkFailed");
    expect(response.headers.get("location")).not.toContain("kc_action");
  });
});
