import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { realmExists, ensureRedirectUriRegistered } from "@/lib/auth/keycloak-admin";
import {
  discoverRealm,
  buildAuthorizationUrl,
  generatePkcePair,
  generateState,
  generateNonce,
} from "@/lib/auth/oidc";
import { encryptOidcTxn, OIDC_TXN_COOKIE, txnCookieOptions } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

const TENANT_SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Step 1 of the login flow (Section 67's "there is no single shared login
 * realm" problem): the user submits a tenant workspace ID (== the
 * tenant's Keycloak realm name, docs/human-auth.md — "Realm names equal
 * the tenant's slug"), this resolves it to a real realm, then starts a
 * standard OIDC authorization-code + PKCE redirect to *that* realm.
 * See docs/auth-flow.md for the full design and why this approach (over
 * e.g. subdomain-per-tenant, which this deployment doesn't have DNS for
 * yet) was chosen.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tenantSlug = String(form.get("tenantSlug") ?? "").trim();
  const localeRaw = String(form.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(localeRaw as (typeof routing.locales)[number])
    ? localeRaw
    : routing.defaultLocale;

  const loginUrl = new URL(`/${locale}/login`, request.url);

  if (!tenantSlug) {
    loginUrl.searchParams.set("error", "tenantSlugRequired");
    return NextResponse.redirect(loginUrl, 303);
  }
  if (!TENANT_SLUG_PATTERN.test(tenantSlug)) {
    loginUrl.searchParams.set("error", "tenantSlugInvalidFormat");
    return NextResponse.redirect(loginUrl, 303);
  }

  const exists = await realmExists(tenantSlug);
  if (!exists) {
    loginUrl.searchParams.set("error", "tenantNotFound");
    return NextResponse.redirect(loginUrl, 303);
  }

  const discovery = await discoverRealm(tenantSlug);
  const redirectUri = new URL("/api/auth/callback", env.APP_BASE_URL).toString();
  const webOrigin = new URL(env.APP_BASE_URL).origin;

  await ensureRedirectUriRegistered(tenantSlug, redirectUri, webOrigin);

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const nonce = generateNonce();

  const authorizationUrl = buildAuthorizationUrl({
    discovery,
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
  });

  const txnCookieValue = await encryptOidcTxn({
    tenantSlug,
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
