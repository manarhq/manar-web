import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

import { discoverIssuer } from "@/lib/auth/oidc";
import { decryptSession, deleteSessionCookie, readSessionCookieValue } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

/** Clears the local session cookie and — when possible — also ends the
 * session at the identity provider (front-channel logout via Keycloak's
 * `end_session_endpoint`), so "log out" actually logs the user out of
 * their realm session, not just this app's view of it. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const localeRaw = String(form?.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(localeRaw as (typeof routing.locales)[number])
    ? localeRaw
    : routing.defaultLocale;

  const raw = readSessionCookieValue(request.cookies);
  const session = raw ? await decryptSession(raw) : null;

  const loginUrl = new URL(`/${locale}/login`, env.APP_BASE_URL);
  loginUrl.searchParams.set("notice", "signedOut");

  const response = NextResponse.redirect(loginUrl, 303);
  deleteSessionCookie(response.cookies);

  if (session) {
    try {
      const discovery = await discoverIssuer();
      if (discovery.end_session_endpoint && session.idToken) {
        const endSessionUrl = new URL(discovery.end_session_endpoint);
        endSessionUrl.searchParams.set("id_token_hint", session.idToken);
        endSessionUrl.searchParams.set("post_logout_redirect_uri", loginUrl.toString());
        const endSessionResponse = NextResponse.redirect(endSessionUrl, 303);
        deleteSessionCookie(endSessionResponse.cookies);
        return endSessionResponse;
      }
    } catch (error) {
      console.error(
        "Failed to build Keycloak end-session redirect; falling back to local logout only",
        error,
      );
    }
  }

  return response;
}
