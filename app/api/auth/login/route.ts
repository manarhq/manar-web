import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
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

  // GET /tenants/:slug/oidc-config (Phase 11b Part 1) does the "does this
  // tenant/realm exist" check and the discovery fetch in one round trip —
  // a 404 means "no such workspace", replacing the old separate
  // realmExists() call against Keycloak's own discovery endpoint.
  const discovery = await discoverRealm(tenantSlug);
  if (!discovery) {
    loginUrl.searchParams.set("error", "tenantNotFound");
    return NextResponse.redirect(loginUrl, 303);
  }

  // manar-api's TenantProvisioningService registers this exact callback
  // URL (and its origin) against every tenant realm's confidential client
  // at tenant-creation time now (Phase 14 security cleanup 2,
  // MANAR_WEB_BASE_URL server-side) — manar-web used to do this itself,
  // lazily, on first login against a given realm
  // (lib/auth/keycloak-admin.ts's ensureRedirectUriRegistered, removed),
  // which is why this app no longer needs standing Keycloak admin
  // credentials at all. See docs/auth-flow.md.
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
