import "server-only";

import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

import { env } from "@/lib/env";

/**
 * Token storage: encrypted, httpOnly, server-only session cookie (the
 * "BFF"/"token handler" pattern current OAuth guidance for browser apps
 * converges on — see docs/auth-flow.md's "Token storage" section for the
 * full reasoning and the sources consulted). The access/refresh tokens
 * Keycloak issues are never sent to the browser in any form: they're
 * encrypted (JWE, A256GCM) into this cookie server-side at
 * /api/auth/callback, decrypted only inside route handlers/proxy.ts, and
 * every API call the browser makes goes through /api/bff/*, which reads
 * this cookie and attaches the real Authorization header itself. A
 * successful XSS in the SPA can still call the API as the logged-in user
 * (that's the accepted BFF trade-off), but it cannot exfiltrate a
 * long-lived bearer token to replay outside the browser.
 */

export const SESSION_COOKIE = "manar_session";
export const OIDC_TXN_COOKIE = "manar_oidc_txn";

// jose's `dir` alg needs the raw key bytes to match the cipher's key
// size (32 bytes for A256GCM), so the configured secret (arbitrary
// length, validated >= 32 chars by lib/env.ts) is hashed down to exactly
// that.
function sessionKey(): Uint8Array {
  return new Uint8Array(createHash("sha256").update(env.SESSION_SECRET).digest());
}

export interface SessionPayload {
  tenantSlug: string;
  issuer: string;
  subject: string;
  email?: string;
  displayName?: string;
  roles: string[];
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  /** Epoch milliseconds; absent if Keycloak didn't return a refresh TTL. */
  refreshTokenExpiresAt?: number;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h absolute cap regardless of refresh-token life.

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ ...payload } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(sessionKey());
}

export async function decryptSession(cookieValue: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(cookieValue, sessionKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export interface OidcTxnPayload {
  tenantSlug: string;
  issuer: string;
  codeVerifier: string;
  state: string;
  nonce: string;
  locale: string;
  redirectUri: string;
}

const TXN_MAX_AGE_SECONDS = 60 * 10; // Ten minutes to complete the redirect round trip.

export async function encryptOidcTxn(payload: OidcTxnPayload): Promise<string> {
  return new EncryptJWT({ ...payload } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${TXN_MAX_AGE_SECONDS}s`)
    .encrypt(sessionKey());
}

export async function decryptOidcTxn(cookieValue: string): Promise<OidcTxnPayload | null> {
  try {
    const { payload } = await jwtDecrypt(cookieValue, sessionKey());
    return payload as unknown as OidcTxnPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(session: SessionPayload, skewMs = 10_000): boolean {
  return Date.now() + skewMs >= session.accessTokenExpiresAt;
}

export function isRefreshable(session: SessionPayload): boolean {
  return Boolean(session.refreshToken) && (session.refreshTokenExpiresAt ?? Infinity) > Date.now();
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export const txnCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TXN_MAX_AGE_SECONDS,
};
