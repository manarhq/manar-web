import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import {
  buildAuthorizationUrl,
  discoverIssuer,
  generateNonce,
  generatePkcePair,
  generateState,
} from "@/lib/auth/oidc";
import {
  decryptSession,
  encryptOidcTxn,
  OIDC_TXN_COOKIE,
  readSessionCookieValue,
  txnCookieOptions,
} from "@/lib/auth/session";
import { routing } from "@/i18n/routing";
import { checkCrossSiteRequest } from "@/lib/api/bff-request";

/** Seconds: how recent the sign-in must be for a destructive step (account deletion). */
const MAX_AGE = 300;

/**
 * Step-up: signed-in people are sent through Keycloak again with `max_age=300`, so the token the
 * API sees carries a fresh `auth_time`, and come back to `returnTo` (a path on this site).
 * Anyone without a session goes to the login page. The flow carries the signed-in subject
 * (`linkSubject`), so the callback refuses another account and keeps the active workspace.
 *
 * A POST from the console's own pages only (lib/auth/start-reauth.ts submits the form): another
 * site cannot force a step-up or overwrite the sign-in transaction cookie.
 */
export async function POST(request: NextRequest) {
  if (!checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin).allowed) {
    return NextResponse.json({ error: "cross_site_request_blocked" }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const localeRaw = String(form?.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(localeRaw as (typeof routing.locales)[number])
    ? localeRaw
    : routing.defaultLocale;
  const returnTo = String(form?.get("returnTo") ?? "/overview");
  const raw = readSessionCookieValue(request.cookies);
  const session = raw ? await decryptSession(raw) : null;
  if (!session) return NextResponse.redirect(new URL(`/${locale}/login`, env.APP_BASE_URL), 303);

  const discovery = await discoverIssuer();

  const redirectUri = new URL("/api/auth/callback", env.APP_BASE_URL).toString();
  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const nonce = generateNonce();
  const response = NextResponse.redirect(
    buildAuthorizationUrl({
      discovery,
      redirectUri,
      state,
      nonce,
      codeChallenge: challenge,
      maxAge: MAX_AGE,
      locale,
    }),
    303,
  );
  response.cookies.set(
    OIDC_TXN_COOKIE,
    await encryptOidcTxn({
      issuer: discovery.issuer,
      codeVerifier: verifier,
      state,
      nonce,
      locale,
      redirectUri,
      linkSubject: session.subject,
      returnTo,
    }),
    txnCookieOptions,
  );
  return response;
}
