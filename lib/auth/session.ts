import "server-only";

import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";

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

/**
 * Bug found and fixed during Phase 11b Part 2 verification: a real
 * browser (Playwright-driven Chromium — curl has no such limit, which is
 * exactly why Phase 11a's testing never caught this) silently refuses to
 * store a cookie whose value exceeds ~4096 bytes (RFC 6265's
 * recommended, and Chrome's enforced, per-cookie size cap). The
 * encrypted `SessionPayload` JWE — three real Keycloak tokens
 * (access/refresh/id) plus a roles array — routinely exceeds that (5.3KB
 * observed with this demo user's 8 realm roles). The browser would
 * accept the `Set-Cookie` response header over the wire but simply never
 * add it to its cookie jar, so `/api/auth/callback` appeared to succeed
 * (redirect to `/overview`) while the *next* request had no session at
 * all — a silent, total login failure with no error surfaced anywhere.
 *
 * Fixed here, not by shrinking the payload (there's no reliable bound on
 * how large a real Keycloak deployment's tokens/role list can get): the
 * encrypted value is split across multiple same-attributes cookies
 * (`manar_session.0`, `manar_session.1`, ...), each comfortably under
 * the limit, and reassembled on read. `MAX_SESSION_COOKIE_CHUNKS` is a
 * generous, fixed upper bound used both to cap how many chunks a single
 * session can spread across and to know how many chunk names to clear
 * on logout/replacement — a session needing more than this many chunks
 * (~30KB) would indicate something is very wrong upstream, not a case to
 * silently support.
 */
const SESSION_COOKIE_CHUNK_BYTES = 3000;
export const MAX_SESSION_COOKIE_CHUNKS = 10;

function sessionCookieChunkName(index: number): string {
  return index === 0 ? SESSION_COOKIE : `${SESSION_COOKIE}.${index}`;
}

interface CookieWriter {
  set: (name: string, value: string, options?: Record<string, unknown>) => unknown;
}
interface CookieDeleter {
  delete: (name: string) => unknown;
}
interface CookieReader {
  get: (name: string) => { value: string } | undefined;
}

/** Splits an already-encrypted session cookie value across
 * `manar_session`, `manar_session.1`, `manar_session.2`, ... — see the
 * module doc comment above. */
export function setSessionCookie(
  cookies: CookieWriter,
  value: string,
  options: Record<string, unknown>,
): void {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += SESSION_COOKIE_CHUNK_BYTES) {
    chunks.push(value.slice(offset, offset + SESSION_COOKIE_CHUNK_BYTES));
  }
  if (chunks.length > MAX_SESSION_COOKIE_CHUNKS) {
    throw new Error(
      `Session cookie value needs ${chunks.length} chunks, more than the ${MAX_SESSION_COOKIE_CHUNKS}-chunk cap allows`,
    );
  }
  chunks.forEach((chunk, index) => {
    cookies.set(sessionCookieChunkName(index), chunk, options);
  });
}

/** Reassembles a session cookie value written by `setSessionCookie`. */
export function readSessionCookieValue(cookies: CookieReader): string | null {
  const parts: string[] = [];
  for (let index = 0; index < MAX_SESSION_COOKIE_CHUNKS; index++) {
    const chunk = cookies.get(sessionCookieChunkName(index));
    if (!chunk) break;
    parts.push(chunk.value);
  }
  return parts.length > 0 ? parts.join("") : null;
}

/** Clears every possible session cookie chunk — always clears the full
 * fixed range, not just however many the current session happened to
 * use, so a stale chunk from a previous, larger session can never
 * linger (e.g. a user whose role count dropped between logins). */
export function deleteSessionCookie(cookies: CookieDeleter): void {
  for (let index = 0; index < MAX_SESSION_COOKIE_CHUNKS; index++) {
    cookies.delete(sessionCookieChunkName(index));
  }
}

// jose's `dir` alg needs the raw key bytes to match the cipher's key
// size (32 bytes for A256GCM), so the configured secret (arbitrary
// length, validated >= 32 chars by lib/env.ts) is hashed down to exactly
// that.
function sessionKey(): Uint8Array {
  return new Uint8Array(createHash("sha256").update(env.SESSION_SECRET).digest());
}

/**
 * Both cookies below are encrypted with the same key, so each carries its
 * own JWE `typ` and is shape-checked on read: a transaction cookie must
 * never decrypt as a session (GATE-0 S40), and a token without `exp`, or
 * a session without an access-token expiry, is treated as expired rather
 * than as "never expires".
 */
const SESSION_TYP = "manar-session+jwt";
const OIDC_TXN_TYP = "manar-oidc-txn+jwt";

const sessionSchema = z.object({
  issuer: z.string().min(1),
  subject: z.string().min(1),
  email: z.string().optional(),
  displayName: z.string().optional(),
  /** The active workspace (tenant id), sent to manar-api as X-Manar-Workspace and checked there
   * against Membership on every request. Absent while the workspace is still being set up.
   * Roles are deliberately not stored: the web reads them from manar-api (`/me`). */
  workspaceId: z.string().min(1).optional(),
  /** The workspace type, which picks the shell (personal or console). Absent means COMPANY. */
  workspaceKind: z.enum(["PERSONAL", "COMPANY", "SAMPLE"]).optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  /** Epoch milliseconds. */
  accessTokenExpiresAt: z.number().finite(),
  /** Epoch milliseconds; absent if Keycloak didn't return a refresh TTL. */
  refreshTokenExpiresAt: z.number().finite().optional(),
});

export type SessionPayload = z.infer<typeof sessionSchema>;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h absolute cap regardless of refresh-token life.

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ ...payload } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: SESSION_TYP })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(sessionKey());
}

export async function decryptSession(cookieValue: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(cookieValue, sessionKey(), {
      typ: SESSION_TYP,
      requiredClaims: ["exp"],
    });
    const parsed = sessionSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const oidcTxnSchema = z.object({
  issuer: z.string().min(1),
  codeVerifier: z.string().min(1),
  state: z.string().min(1),
  nonce: z.string().min(1),
  locale: z.string().min(1),
  redirectUri: z.string().min(1),
  /** Link flow: the subject that was signed in when the link started. The callback refuses a
   * different subject, so linking can never switch the session to another account. */
  linkSubject: z.string().min(1).optional(),
  /** Path (without locale) to return to after a link flow. */
  returnTo: z.string().min(1).optional(),
});

export type OidcTxnPayload = z.infer<typeof oidcTxnSchema>;

const TXN_MAX_AGE_SECONDS = 60 * 10; // Ten minutes to complete the redirect round trip.

export async function encryptOidcTxn(payload: OidcTxnPayload): Promise<string> {
  return new EncryptJWT({ ...payload } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: OIDC_TXN_TYP })
    .setIssuedAt()
    .setExpirationTime(`${TXN_MAX_AGE_SECONDS}s`)
    .encrypt(sessionKey());
}

export async function decryptOidcTxn(cookieValue: string): Promise<OidcTxnPayload | null> {
  try {
    const { payload } = await jwtDecrypt(cookieValue, sessionKey(), {
      typ: OIDC_TXN_TYP,
      requiredClaims: ["exp"],
    });
    const parsed = oidcTxnSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(session: SessionPayload, skewMs = 10_000): boolean {
  // Written as "not provably fresh" so a missing or NaN expiry reads as expired.
  return !(Date.now() + skewMs < session.accessTokenExpiresAt);
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
