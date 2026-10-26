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
  process.env.MANAR_BFF_SERVICE_TOKEN = "test-bff-service-token";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));

const ISSUER = "http://kc.test/realms/acme";
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
  return `${b64({ alg: "none" })}.${b64({ iss: ISSUER, sub, realm_access: { roles: ["ADMIN"] } })}.x`;
}

function mockUpstream(idTokenValue: string | undefined) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/oidc-config")) {
        return Response.json({
          issuerUrl: ISSUER,
          clientId: CLIENT_ID,
          authorizationEndpoint: `${ISSUER}/auth`,
          tokenEndpoint: TOKEN_ENDPOINT,
          endSessionEndpoint: `${ISSUER}/logout`,
          jwksUri: JWKS_URI,
        });
      }
      if (url.endsWith("/oidc-client-secret")) return Response.json({ clientSecret: "s" });
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
      return new Response("not found", { status: 404 });
    }),
  );
}

async function callback(
  idTokenValue: string | undefined,
  requestOrigin = "http://localhost:3100",
): Promise<Response> {
  mockUpstream(idTokenValue);
  const { encryptOidcTxn } = await import("@/lib/auth/session");
  const txn = await encryptOidcTxn({
    tenantSlug: "acme",
    issuer: ISSUER,
    codeVerifier: "v",
    state: STATE,
    nonce: NONCE,
    locale: "en",
    redirectUri: "http://localhost:3100/api/auth/callback",
  });
  const { GET } = await import("@/app/api/auth/callback/route");
  const request = new NextRequest(`${requestOrigin}/api/auth/callback?code=c&state=${STATE}`, {
    headers: { cookie: `manar_oidc_txn=${txn}` },
  });
  return GET(request);
}

function expectRejected(response: Response) {
  const location = response.headers.get("location") ?? "";
  expect(location).toContain("/en/login");
  expect(location).toContain("error=callbackFailed");
  expect(location).not.toContain("/overview");
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
    expect(response.headers.get("location")).toContain("/en/overview");
    expect(response.headers.get("set-cookie")).toMatch(/manar_session=[^;]+/);
  });

  it("redirects to APP_BASE_URL, not the address the server was reached on", async () => {
    // Behind Traefik and the tunnel, a standalone Next server sees request.url as its own
    // bind address (http://0.0.0.0:3000), which the browser cannot open.
    const response = await callback(await idToken(), "http://0.0.0.0:3000");
    const location = response.headers.get("location") ?? "";
    expect(location).toBe("http://localhost:3100/en/overview");
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
});
