import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { checkCrossSiteRequest } from "@/lib/api/bff-request";
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

/** The only links offered, mapped to Keycloak's application-initiated actions. */
const LINK_ACTIONS = {
  microsoft: "idp_link:microsoft",
  github: "idp_link:github",
  // No "email" action on purpose: an email address is never attached to an account from here (it
  // would be an account-takeover route through the magic link). Email stays a separate sign-in.
} as const;
type LinkMethod = keyof typeof LINK_ACTIONS;

/**
 * Link another sign-in method while signed in (Settings -> Sign-in methods). Starts a new
 * authorization request with a Keycloak application-initiated action. Linking happens only here,
 * with a live session: the callback refuses a different subject, so a link can never move the
 * session onto another account, and nothing is ever linked by email.
 */
export async function POST(request: NextRequest) {
  const csrf = checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin);
  if (!csrf.allowed) {
    return NextResponse.json({ error: "cross_site_request_blocked" }, { status: 403 });
  }

  const form = await request.formData();
  const method = String(form.get("method") ?? "") as LinkMethod;
  const localeRaw = String(form.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(localeRaw as (typeof routing.locales)[number])
    ? localeRaw
    : routing.defaultLocale;
  const back = new URL(`/${locale}/settings/sign-in`, env.APP_BASE_URL);

  const raw = readSessionCookieValue(request.cookies);
  const session = raw ? await decryptSession(raw) : null;
  if (!session || !Object.hasOwn(LINK_ACTIONS, method)) {
    back.searchParams.set("error", "linkFailed");
    return NextResponse.redirect(back, 303);
  }

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
      kcAction: LINK_ACTIONS[method],
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
      returnTo: "/settings/sign-in",
    }),
    txnCookieOptions,
  );
  return response;
}
