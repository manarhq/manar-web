import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";

import { env } from "@/lib/env";
import { discoverIssuer, exchangeCodeForTokens, verifyIdToken } from "@/lib/auth/oidc";
import {
  decryptOidcTxn,
  decryptSession,
  encryptSession,
  OIDC_TXN_COOKIE,
  readSessionCookieValue,
  sessionCookieOptions,
  setSessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";
import { AccountSuspendedError, resolveWorkspace } from "@/lib/auth/workspace.server";
import { routing } from "@/i18n/routing";

interface AccessTokenClaims {
  iss: string;
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

/** The email Keycloak keeps for Microsoft and GitHub users is a placeholder (see realm-manar.yaml). */
const PLACEHOLDER_EMAIL_DOMAIN = "@idp.invalid";

/** A path on this site only (no scheme, no `//host`), else the sign-in methods page. */
function safeReturnTo(returnTo: string | undefined): string {
  return returnTo && /^\/(?!\/)[\w\-/]*$/.test(returnTo) ? returnTo : "/settings/sign-in";
}

/**
 * Step 2 of sign-in: Keycloak redirects back with `?code=...&state=...`. The tokens never leave
 * this handler in plaintext: they are encrypted into the session cookie. The session holds no
 * roles; the API's Membership decides them on every request.
 *
 * After the ID token is verified (signature, iss, aud, exp, nonce), the first sign-in creates the
 * personal workspace (idempotent) and the active workspace is picked from the caller's own list.
 * A link flow (Settings -> Sign-in methods) must come back as the same subject it started as.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const txnCookie = request.cookies.get(OIDC_TXN_COOKIE)?.value;
  const txn = txnCookie ? await decryptOidcTxn(txnCookie) : null;
  const locale = txn?.locale ?? routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/login`, env.APP_BASE_URL);

  function fail(reason: string): NextResponse {
    const target = txn?.linkSubject
      ? new URL(`/${locale}${safeReturnTo(txn.returnTo)}`, env.APP_BASE_URL)
      : loginUrl;
    target.searchParams.set("error", txn?.linkSubject ? "linkFailed" : reason);
    const response = NextResponse.redirect(target, 303);
    response.cookies.delete(OIDC_TXN_COOKIE);
    return response;
  }

  if (errorParam) return fail("callbackFailed");
  if (!code || !state || !txn) return fail("callbackFailed");
  if (state !== txn.state) return fail("callbackFailed");

  try {
    const discovery = await discoverIssuer();
    if (discovery.issuer !== txn.issuer) return fail("callbackFailed");

    const tokens = await exchangeCodeForTokens({
      discovery,
      code,
      redirectUri: txn.redirectUri,
      codeVerifier: txn.codeVerifier,
    });

    if (!tokens.id_token) return fail("callbackFailed");
    const idClaims = await verifyIdToken({
      idToken: tokens.id_token,
      discovery,
      nonce: txn.nonce,
    });

    const claims = decodeJwt<AccessTokenClaims>(tokens.access_token);
    if (claims.iss !== discovery.issuer || claims.sub !== idClaims.sub) {
      return fail("callbackFailed");
    }

    let workspaceId: string | undefined;
    let workspaceKind: SessionPayload["workspaceKind"];
    let ready = true;
    let suspended = false;

    if (txn.linkSubject) {
      // Linking never changes who is signed in, and keeps the workspace the user was in.
      if (claims.sub !== txn.linkSubject) return fail("callbackFailed");
      const raw = readSessionCookieValue(request.cookies);
      const previous = raw ? await decryptSession(raw) : null;
      if (!previous || previous.subject !== claims.sub) return fail("callbackFailed");
      workspaceId = previous.workspaceId;
      workspaceKind = previous.workspaceKind;
    } else {
      // A suspended or banned person signs in to a session with no workspace and sees why.
      const resolution = await resolveWorkspace(tokens.access_token, { bootstrap: true }).catch(
        (error: unknown) => {
          if (error instanceof AccountSuspendedError) return { state: "suspended" as const };
          throw error;
        },
      );
      if (resolution.state === "suspended") {
        ready = false;
        suspended = true;
      } else if (resolution.state === "ready") {
        workspaceId = resolution.workspaceId;
        workspaceKind = resolution.workspaceKind;
      } else {
        ready = false;
      }
    }

    const email = claims.email?.endsWith(PLACEHOLDER_EMAIL_DOMAIN) ? undefined : claims.email;
    const session: SessionPayload = {
      issuer: discovery.issuer,
      subject: claims.sub,
      email,
      displayName: claims.name ?? claims.preferred_username,
      workspaceId,
      workspaceKind,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      refreshTokenExpiresAt: tokens.refresh_expires_in
        ? Date.now() + tokens.refresh_expires_in * 1000
        : undefined,
    };

    const sessionCookieValue = await encryptSession(session);

    // The locale root forwards to the workspace's home; /setup waits for a workspace being set up.
    // Link and step-up flows return to the page that asked for them (a local path only).
    const destination = txn.linkSubject
      ? `/${locale}${safeReturnTo(txn.returnTo)}`
      : suspended
        ? `/${locale}/suspended`
        : ready
          ? `/${locale}`
          : `/${locale}/setup`;
    const response = NextResponse.redirect(new URL(destination, env.APP_BASE_URL), 303);
    setSessionCookie(response.cookies, sessionCookieValue, sessionCookieOptions);
    response.cookies.delete(OIDC_TXN_COOKIE);
    return response;
  } catch (error) {
    console.error("OIDC callback failed", error);
    return fail("callbackFailed");
  }
}
