// @vitest-environment node
import { NextRequest } from "next/server";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GATE-0 B21 / S11: the OIDC callback must verify the ID token (signature
 * against the realm's JWKS, iss, aud, exp, nonce) before it mints a session.
 * Written as attacks against the real route handler: each forged token must
 * end on the login page with an error, never on /overview with a session.
 */

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));

const ISSUER = "http://kc.test/realms/manar";
const CLIENT_ID = "manar-web";
const JWKS_URI = `${ISSUER}/protocol/openid-connect/certs`;
const TOKEN_ENDPOINT = `${ISSUER}/protocol/openid-connect/token`;
const NONCE = "nonce-from-login";
const STATE = "state-from-login";

let realKey: CryptoKey;
let attackerKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const real = await generateKeyPair("RS256", { extractable: true });
  const attacker = await generateKeyPair("RS256");
  realKey = real.privateKey;
  attackerKey = attacker.privateKey;
  publicJwk = { ...(await exportJWK(real.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
});

interface IdTokenOptions {
  key?: CryptoKey;
  iss?: string;
  aud?: string;
  nonce?: string | null;
  exp?: number;
  sub?: string;
}

async function idToken(opts: IdTokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = { sub: opts.sub ?? "user-1" };
  if (opts.nonce !== null) claims.nonce = opts.nonce ?? NONCE;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? CLIENT_ID)
    .setIssuedAt(now - 5)
    .setExpirationTime(opts.exp ?? now + 300)
    .sign(opts.key ?? realKey);
}

function accessToken(sub = "user-1"): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  // The token even carries roles: the session must not keep them.
  return `${b64({ alg: "none" })}.${b64({ iss: ISSUER, sub, realm_access: { roles: ["ADMIN"] } })}.x`;
}

let workspaces: unknown[] = [
  {
    tenantId: "t-personal",
    name: "Personal workspace",
    kind: "PERSONAL",
    status: "ACTIVE",
    membershipStatus: "ACTIVE",
    roles: ["TENANT_OWNER"],
  },
];
let apiCalls: string[] = [];

function mockUpstream(idTokenValue: string | undefined) {
  apiCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/auth`,
          token_endpoint: TOKEN_ENDPOINT,
          end_session_endpoint: `${ISSUER}/logout`,
          jwks_uri: JWKS_URI,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return Response.json({
          access_token: accessToken(),
          id_token: idTokenValue,
          refresh_token: "r",
          expires_in: 300,
          token_type: "Bearer",
        });
      }
      if (url === JWKS_URI) return Response.json({ keys: [publicJwk] });
      if (url.startsWith("http://api.test")) {
        apiCalls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
        if (url.endsWith("/workspaces/bootstrap"))
          return Response.json({ tenantId: "t-personal", status: "ACTIVE" });
        if (url.endsWith("/workspaces")) return Response.json({ items: workspaces });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

async function callback(
  idTokenValue: string | undefined,
  requestOrigin = "http://localhost:3100",
  txnExtra: { linkSubject?: string; returnTo?: string } = {},
  cookie = "",
): Promise<Response> {
  mockUpstream(idTokenValue);
  const { encryptOidcTxn } = await import("@/lib/auth/session");
  const txn = await encryptOidcTxn({
    issuer: ISSUER,
    codeVerifier: "v",
    state: STATE,
    nonce: NONCE,
    locale: "en",
    redirectUri: "http://localhost:3100/api/auth/callback",
    ...txnExtra,
  });
  const { GET } = await import("@/app/api/auth/callback/route");
  const request = new NextRequest(`${requestOrigin}/api/auth/callback?code=c&state=${STATE}`, {
    headers: { cookie: `manar_oidc_txn=${txn}${cookie}` },
  });
  return GET(request);
}

function expectRejected(response: Response) {
  const location = response.headers.get("location") ?? "";
  expect(location).toContain("/en/login");
  expect(location).toContain("error=callbackFailed");
  expect(location).not.toMatch(/\/en\/?$/);
  expect(response.headers.get("set-cookie") ?? "").not.toMatch(/manar_session=[^;]+/);
}

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OIDC callback ID-token verification", () => {
  it("accepts a correctly signed token with the right iss, aud, exp and nonce", async () => {
    const response = await callback(await idToken());
    expect(response.headers.get("location")).toBe("http://localhost:3100/en");
    expect(response.headers.get("set-cookie")).toMatch(/manar_session=[^;]+/);
    // First sign-in creates the personal workspace, then reads the caller's own list.
    expect(apiCalls).toEqual(["POST /workspaces/bootstrap", "GET /workspaces"]);
  });

  it("redirects to APP_BASE_URL, not the address the server was reached on", async () => {
    // Behind Traefik and the tunnel, a standalone Next server sees request.url as its own
    // bind address (http://0.0.0.0:3000), which the browser cannot open.
    const response = await callback(await idToken(), "http://0.0.0.0:3000");
    const location = response.headers.get("location") ?? "";
    expect(location).toBe("http://localhost:3100/en");
    expect(location).not.toContain("0.0.0.0");
  });

  it("rejects a token signed by a key that is not in the realm JWKS", async () => {
    expectRejected(await callback(await idToken({ key: attackerKey })));
  });

  it("rejects a token from another issuer", async () => {
    expectRejected(await callback(await idToken({ iss: "http://kc.test/realms/other" })));
  });

  it("rejects a token issued to another client", async () => {
    expectRejected(await callback(await idToken({ aud: "some-other-client" })));
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 600;
    expectRejected(await callback(await idToken({ exp: past })));
  });

  it("rejects a token whose nonce is not this transaction's", async () => {
    expectRejected(await callback(await idToken({ nonce: "replayed-nonce" })));
  });

  it("rejects a token with no nonce", async () => {
    expectRejected(await callback(await idToken({ nonce: null })));
  });

  it("rejects a token response with no ID token at all", async () => {
    expectRejected(await callback(undefined));
  });

  it("rejects an ID token for a different subject than the access token", async () => {
    expectRejected(await callback(await idToken({ sub: "someone-else" })));
  });

  it("stores the workspace and no roles in the session", async () => {
    const response = await callback(await idToken());
    const cookie = response.headers.get("set-cookie") ?? "";
    const value = /manar_session=([^;]+)/.exec(cookie)?.[1] ?? "";
    const { decryptSession } = await import("@/lib/auth/session");
    const session = await decryptSession(value);
    expect(session).toMatchObject({ workspaceId: "t-personal", workspaceKind: "PERSONAL" });
    expect(JSON.stringify(session)).not.toContain("roles");
  });

  it("sends a workspace that is still being set up to the setup screen", async () => {
    workspaces = [
      {
        tenantId: "t-personal",
        name: "P",
        kind: "PERSONAL",
        status: "QUEUED",
        membershipStatus: "ACTIVE",
        roles: [],
      },
    ];
    const response = await callback(await idToken());
    expect(response.headers.get("location")).toBe("http://localhost:3100/en/setup");
    workspaces = [
      {
        tenantId: "t-personal",
        name: "Personal workspace",
        kind: "PERSONAL",
        status: "ACTIVE",
        membershipStatus: "ACTIVE",
        roles: [],
      },
    ];
  });

  it("a link flow that comes back as another subject is refused", async () => {
    const response = await callback(await idToken(), undefined, {
      linkSubject: "someone-else",
      returnTo: "/settings/sign-in",
    });
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/en/settings/sign-in");
    expect(location).toContain("error=linkFailed");
    expect(response.headers.get("set-cookie") ?? "").not.toMatch(/manar_session=[^;]+/);
  });
});
