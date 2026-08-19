import { NextResponse, type NextRequest } from "next/server";

import { discoverRealm } from "@/lib/auth/oidc";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";
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

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = raw ? await decryptSession(raw) : null;

  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set("notice", "signedOut");

  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.delete(SESSION_COOKIE);

  if (session) {
    try {
      const discovery = await discoverRealm(session.tenantSlug);
      if (discovery.end_session_endpoint && session.idToken) {
        const endSessionUrl = new URL(discovery.end_session_endpoint);
        endSessionUrl.searchParams.set("id_token_hint", session.idToken);
        endSessionUrl.searchParams.set("post_logout_redirect_uri", loginUrl.toString());
        const endSessionResponse = NextResponse.redirect(endSessionUrl, 303);
        endSessionResponse.cookies.delete(SESSION_COOKIE);
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
