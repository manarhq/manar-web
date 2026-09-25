import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";

import {
  discoverRealm,
  exchangeCodeForTokens,
  getTenantClientSecret,
  verifyIdToken,
} from "@/lib/auth/oidc";
import {
  decryptOidcTxn,
  encryptSession,
  OIDC_TXN_COOKIE,
  sessionCookieOptions,
  setSessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

interface KeycloakAccessTokenClaims {
  iss: string;
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

/**
 * Step 2 of the login flow: Keycloak redirects the browser back here with
 * `?code=...&state=...` after the user authenticates on *their tenant's*
 * realm (never on any page Manar itself renders — Section 67's "no
 * password collection in Manar's own forms").
 *
 * The access/refresh tokens returned by the token endpoint never leave
 * this handler in plaintext: they're immediately encrypted into the
 * session cookie (lib/auth/session.ts) and the response carries only that
 * cookie plus a redirect, never the tokens themselves in a URL, a
 * client-visible cookie, or a response body.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const txnCookie = request.cookies.get(OIDC_TXN_COOKIE)?.value;
  const txn = txnCookie ? await decryptOidcTxn(txnCookie) : null;
  const fallbackLocale = routing.defaultLocale;
  const locale = txn?.locale ?? fallbackLocale;
  const loginUrl = new URL(`/${locale}/login`, request.url);

  function fail(reason: string): NextResponse {
    loginUrl.searchParams.set("error", reason);
    const response = NextResponse.redirect(loginUrl, 303);
    response.cookies.delete(OIDC_TXN_COOKIE);
    return response;
  }

  if (errorParam) return fail("callbackFailed");
  if (!code || !state || !txn) return fail("callbackFailed");
  if (state !== txn.state) return fail("callbackFailed");

  try {
    const discovery = await discoverRealm(txn.tenantSlug);
    if (!discovery) return fail("callbackFailed");
    const clientSecret = await getTenantClientSecret(txn.tenantSlug);

    const tokens = await exchangeCodeForTokens({
      discovery,
      clientSecret,
      code,
      redirectUri: txn.redirectUri,
      codeVerifier: txn.codeVerifier,
    });

    // The ID token is the authentication result: verify it (signature, iss,
    // aud, exp, nonce) before trusting anything else from this exchange.
    if (!tokens.id_token) return fail("callbackFailed");
    const idClaims = await verifyIdToken({
      idToken: tokens.id_token,
      discovery,
      nonce: txn.nonce,
    });

    const claims = decodeJwt<KeycloakAccessTokenClaims>(tokens.access_token);
    if (claims.iss !== discovery.issuer || claims.sub !== idClaims.sub) {
      // Defense in depth: the token came directly from this realm's own
      // token endpoint over a trusted server-to-server TLS connection, so
      // this can't be a forged issuer the way it could on manar-api's
      // client-facing JwtAuthGuard — but a mismatch here would still mean
      // something is misconfigured (e.g. talking to the wrong realm) and
      // should never be treated as a valid session.
      return fail("callbackFailed");
    }

    const roles = (claims.realm_access?.roles ?? []).filter(
      (role) => role !== "offline_access" && role !== "uma_authorization",
    );

    const session: SessionPayload = {
      tenantSlug: txn.tenantSlug,
      issuer: discovery.issuer,
      subject: claims.sub,
      email: claims.email,
      displayName: claims.name ?? claims.preferred_username,
      roles,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      refreshTokenExpiresAt: tokens.refresh_expires_in
        ? Date.now() + tokens.refresh_expires_in * 1000
        : undefined,
    };

    const sessionCookieValue = await encryptSession(session);

    const overviewUrl = new URL(`/${locale}/overview`, request.url);
    const response = NextResponse.redirect(overviewUrl, 303);
    setSessionCookie(response.cookies, sessionCookieValue, sessionCookieOptions);
    response.cookies.delete(OIDC_TXN_COOKIE);
    return response;
  } catch (error) {
    console.error("OIDC callback failed", error);
    return fail("callbackFailed");
  }
}
