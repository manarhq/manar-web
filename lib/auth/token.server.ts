import "server-only";

import { isAccessTokenExpired, type SessionPayload } from "@/lib/auth/session";

/**
 * The session's access token if it is still valid, else null. Server Components NEVER refresh:
 * they cannot store the rotated tokens, so a refresh there would use up the refresh token and the
 * session would die a few minutes later. Refreshing happens only where the new cookie can be
 * written: `proxy.ts` (page navigations) and the BFF route (API calls).
 */
export function freshAccessToken(session: SessionPayload): string | null {
  return isAccessTokenExpired(session) ? null : session.accessToken;
}
