import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import {
  buildAuthorizationUrl,
  discoverIssuer,
  generateNonce,
  generatePkcePair,
  generateState,
  isSignInMethod,
} from "@/lib/auth/oidc";
import { encryptOidcTxn, OIDC_TXN_COOKIE, txnCookieOptions } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

/**
 * Sign in (spec 4.1): no workspace ID. The button the user pressed (`method`: microsoft, github
 * or email) picks the Keycloak sign-in method on the shared realm. Standard authorization-code
 * flow with PKCE; Manar never sees a password.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const methodRaw = String(form.get("method") ?? "");
  const localeRaw = String(form.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(localeRaw as (typeof routing.locales)[number])
    ? localeRaw
    : routing.defaultLocale;

  const loginUrl = new URL(`/${locale}/login`, env.APP_BASE_URL);
  if (!isSignInMethod(methodRaw)) {
    loginUrl.searchParams.set("error", "callbackFailed");
    return NextResponse.redirect(loginUrl, 303);
  }

  let discovery;
  try {
    discovery = await discoverIssuer();
  } catch (error) {
    console.error("OIDC discovery failed", error);
    loginUrl.searchParams.set("error", "unavailable");
    return NextResponse.redirect(loginUrl, 303);
  }

  const redirectUri = new URL("/api/auth/callback", env.APP_BASE_URL).toString();
  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const nonce = generateNonce();

  const authorizationUrl = buildAuthorizationUrl({
    discovery,
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
    method: methodRaw,
    locale,
  });

  const txnCookieValue = await encryptOidcTxn({
    issuer: discovery.issuer,
    codeVerifier: verifier,
    state,
    nonce,
    locale,
    redirectUri,
  });

  const response = NextResponse.redirect(authorizationUrl, 303);
  response.cookies.set(OIDC_TXN_COOKIE, txnCookieValue, txnCookieOptions);
  return response;
}
