import "server-only";

import { discoverIssuer, refreshTokens } from "@/lib/auth/oidc";
import { isAccessTokenExpired, isRefreshable, type SessionPayload } from "@/lib/auth/session";

/**
 * An access token that is valid now, for a Server Component. Server Components cannot set
 * cookies, so a refresh here lasts for this request only; the BFF stores the refreshed session on
 * the next API call from the browser.
 */
export async function freshAccessToken(session: SessionPayload): Promise<string | null> {
  if (!isAccessTokenExpired(session)) return session.accessToken;
  if (!isRefreshable(session)) return null;
  const refreshed = await refreshTokens({
    discovery: await discoverIssuer(),
    refreshToken: session.refreshToken!,
  });
  return refreshed.access_token;
}
