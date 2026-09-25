// @vitest-environment node
import { createHash } from "node:crypto";
import { EncryptJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

/**
 * GATE-0 S40: the OIDC transaction cookie and the session cookie share an
 * encryption key, so the session reader must refuse anything that is not a
 * session (wrong type, wrong shape) and must treat a missing expiry as
 * expired, not as "valid forever".
 */

const SECRET = "test-session-secret-at-least-32-characters-long";
vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.MANAR_BFF_SERVICE_TOKEN = "test-bff-service-token";
});
vi.mock("server-only", () => ({}));

const { decryptSession, decryptOidcTxn, encryptOidcTxn, encryptSession, isAccessTokenExpired } =
  await import("@/lib/auth/session");

const key = new Uint8Array(createHash("sha256").update(SECRET).digest());

const session = {
  tenantSlug: "acme",
  issuer: "http://kc.test/realms/acme",
  subject: "user-1",
  roles: ["ADMIN"],
  accessToken: "at",
  accessTokenExpiresAt: Date.now() + 60_000,
};

const txn = {
  tenantSlug: "acme",
  issuer: "http://kc.test/realms/acme",
  codeVerifier: "v",
  state: "s",
  nonce: "n",
  locale: "en",
  redirectUri: "http://localhost/api/auth/callback",
};

/** Same key and cipher as the app, but with the claims and header we choose. */
function forge(payload: Record<string, unknown>, opts: { typ?: string; exp?: boolean } = {}) {
  const jwt = new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", ...(opts.typ ? { typ: opts.typ } : {}) })
    .setIssuedAt();
  if (opts.exp !== false) jwt.setExpirationTime("1h");
  return jwt.encrypt(key);
}

describe("session cookie type separation", () => {
  it("round-trips a real session", async () => {
    expect(await decryptSession(await encryptSession(session))).toMatchObject(session);
  });

  it("refuses an OIDC transaction cookie presented as a session", async () => {
    expect(await decryptSession(await encryptOidcTxn(txn))).toBeNull();
  });

  it("refuses a session cookie presented as an OIDC transaction", async () => {
    expect(await decryptOidcTxn(await encryptSession(session))).toBeNull();
  });

  it("refuses an untyped token even when its claims look like a session", async () => {
    expect(await decryptSession(await forge(session))).toBeNull();
  });

  it("refuses a session token with no exp claim", async () => {
    expect(
      await decryptSession(await forge(session, { typ: "manar-session+jwt", exp: false })),
    ).toBeNull();
  });

  it("refuses a session whose payload lacks an access-token expiry", async () => {
    const { accessTokenExpiresAt: _omit, ...noExpiry } = session;
    void _omit;
    expect(await decryptSession(await forge(noExpiry, { typ: "manar-session+jwt" }))).toBeNull();
  });

  it("treats a missing access-token expiry as expired", () => {
    const broken = { ...session, accessTokenExpiresAt: undefined as unknown as number };
    expect(isAccessTokenExpired(broken)).toBe(true);
  });
});
