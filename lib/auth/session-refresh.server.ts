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

/** The caller's session from the request cookie, with a fresh access token (refreshed when due). */
export async function sessionFromRequest(
  request: NextRequest,
): Promise<{ session: SessionPayload } | null> {
  const raw = readSessionCookieValue(request.cookies);
  const session = raw ? await decryptSession(raw) : null;
  if (!session) return null;
  if (!isAccessTokenExpired(session)) return { session };
  if (!isRefreshable(session)) return null;
  const refreshed = await refreshTokens({
    discovery: await discoverIssuer(),
    refreshToken: session.refreshToken!,
  });
  return {
    session: {
      ...session,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? session.refreshToken,
      idToken: refreshed.id_token ?? session.idToken,
      accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshTokenExpiresAt: refreshed.refresh_expires_in
        ? Date.now() + refreshed.refresh_expires_in * 1000
        : session.refreshTokenExpiresAt,
    },
  };
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
