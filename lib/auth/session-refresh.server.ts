import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { discoverIssuer, refreshTokens } from "@/lib/auth/oidc";
import {
  decryptSession,
  encryptSession,
  isAccessTokenExpired,
  isRefreshable,
  readSessionCookieValue,
  sessionCookieOptions,
  setSessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";

/**
 * Exchanges the refresh token for new tokens and returns the session carrying them. The caller
 * MUST store the result (cookie): refresh tokens can rotate, so the old one may be dead afterwards.
 */
export async function refreshSession(session: SessionPayload): Promise<SessionPayload> {
  const refreshed = await refreshTokens({
    discovery: await discoverIssuer(),
    refreshToken: session.refreshToken!,
  });
  return {
    ...session,
    accessToken: refreshed.access_token,
    // A rotated refresh token replaces the old one; none returned means the old one stays valid.
    refreshToken: refreshed.refresh_token ?? session.refreshToken,
    idToken: refreshed.id_token ?? session.idToken,
    accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
    refreshTokenExpiresAt: refreshed.refresh_expires_in
      ? Date.now() + refreshed.refresh_expires_in * 1000
      : session.refreshTokenExpiresAt,
  };
}

/** The caller's session from the request cookie, with a fresh access token (refreshed when due). */
export async function sessionFromRequest(
  request: NextRequest,
): Promise<{ session: SessionPayload; refreshed: boolean } | null> {
  const raw = readSessionCookieValue(request.cookies);
  const session = raw ? await decryptSession(raw) : null;
  if (!session) return null;
  if (!isAccessTokenExpired(session)) return { session, refreshed: false };
  if (!isRefreshable(session)) return null;
  return { session: await refreshSession(session), refreshed: true };
}

/** A JSON response that also stores the (possibly changed) session. */
export async function jsonWithSession(
  body: unknown,
  session: SessionPayload,
  init?: ResponseInit,
): Promise<NextResponse> {
  const response = NextResponse.json(body, init);
  setSessionCookie(response.cookies, await encryptSession(session), sessionCookieOptions);
  return response;
}
