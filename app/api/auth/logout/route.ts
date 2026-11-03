import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

import { discoverIssuer } from "@/lib/auth/oidc";
import { decryptSession, deleteSessionCookie, readSessionCookieValue } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";
import { checkCrossSiteRequest } from "@/lib/api/bff-request";

/** Clears the local session cookie and — when possible — also ends the
 * session at the identity provider (front-channel logout via Keycloak's
 * `end_session_endpoint`), so "log out" actually logs the user out of
 * their realm session, not just this app's view of it. */
export async function POST(request: NextRequest) {
  // Only the console's own forms may sign in or out: another site must not be able to log a person
  // out or overwrite their sign-in transaction (security audit, 3 Nov 2026).
  if (!checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin).allowed) {
    return NextResponse.json({ error: "cross_site_request_blocked" }, { status: 403 });
  }
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
