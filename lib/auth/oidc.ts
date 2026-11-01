import "server-only";

import { randomBytes, createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
  /** The tenant realm's confidential client ID, straight from manar-api's
   * `GET /tenants/:slug/oidc-config` — never a locally-configured default,
   * so there's no chance of it drifting from what manar-api actually
   * provisioned (Phase 11b Part 1). */
  client_id: string;
}

const discoveryCache = new Map<string, OidcDiscovery>();

/**
 * Fetches (and caches) a tenant realm's OIDC discovery info — as of
 * Phase 11b Part 1, from manar-api's own `GET /tenants/:slug/oidc-config`
 * (unauthenticated, human-facing, never manar-api's Keycloak Admin API
 * credentials) rather than Keycloak's per-realm discovery document
 * directly. See docs/auth-flow.md's "Token exchange: via manar-api, not
 * Keycloak directly" section for why this replaced the Phase 11a
 * workaround. A 404 here means "no such tenant/realm" — exactly the
 * signal `/api/auth/login` needs to distinguish that from other failures
 * before ever redirecting the browser anywhere.
 *
 * `fetch` goes straight to `MANAR_API_BASE_URL`, not through
 * `/api/bff/*` — this runs before any Manar session cookie exists, so
 * there's nothing for the BFF proxy to attach.
 */
export async function discoverRealm(realm: string): Promise<OidcDiscovery | null> {
  const cached = discoveryCache.get(realm);
  if (cached) return cached;

  const response = await fetch(
    `${env.MANAR_API_BASE_URL}/tenants/${encodeURIComponent(realm)}/oidc-config`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Failed to resolve OIDC config for tenant "${realm}" (HTTP ${response.status})`,
    );
  }
  const config = (await response.json()) as {
    issuerUrl: string;
    clientId: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    endSessionEndpoint: string;
    jwksUri: string;
  };
  const discovery: OidcDiscovery = {
    issuer: config.issuerUrl,
    authorization_endpoint: config.authorizationEndpoint,
    token_endpoint: config.tokenEndpoint,
    end_session_endpoint: config.endSessionEndpoint,
    jwks_uri: config.jwksUri,
    client_id: config.clientId,
  };
  discoveryCache.set(realm, discovery);
  return discovery;
}

/**
 * Fetches the tenant realm's confidential client secret from manar-api's
 * `GET /tenants/:slug/oidc-client-secret` — gated server-side by
 * `X-Manar-Bff-Token` (Phase 11b Part 1's `BffServiceGuard`), never by
 * Keycloak master-admin credentials. Replaces
 * `lib/auth/keycloak-admin.ts`'s old `getTenantClientSecret` (removed —
 * see docs/auth-flow.md). Deliberately uncached in-process (unlike the
 * old implementation): this is now a cheap, narrowly-scoped call, and not
 * caching it avoids ever holding a stale secret across a rotation.
 */
export async function getTenantClientSecret(realm: string): Promise<string> {
  const response = await fetch(
    `${env.MANAR_API_BASE_URL}/tenants/${encodeURIComponent(realm)}/oidc-client-secret`,
    {
      headers: { "X-Manar-Bff-Token": env.MANAR_BFF_SERVICE_TOKEN },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to resolve OIDC client secret for tenant "${realm}" (HTTP ${response.status})`,
    );
  }
  const body = (await response.json()) as { clientSecret: string };
  return body.clientSecret;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

/** PKCE (RFC 7636) — required regardless of the confidential client's
 * client-secret auth: it binds the authorization code to *this specific
 * browser transaction*, which client-secret auth alone does not, and is
 * current baseline guidance (OAuth 2.1 / RFC 9700) for any interactive
 * authorization-code login, confidential client or not. */
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

export function generateNonce(): string {
  return base64url(randomBytes(16));
}

export function buildAuthorizationUrl(input: {
  discovery: OidcDiscovery;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** Seconds: Keycloak asks for a fresh sign-in if the last one is older (step-up for deletions). */
  maxAge?: number;
}): string {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("client_id", input.discovery.client_id);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (input.maxAge !== undefined) url.searchParams.set("max_age", String(input.maxAge));
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
}

export async function exchangeCodeForTokens(input: {
  discovery: OidcDiscovery;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const response = await fetch(input.discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.discovery.client_id,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: HTTP ${response.status}${text ? `: ${text}` : ""}`);
  }
  return (await response.json()) as TokenResponse;
}

export async function refreshTokens(input: {
  discovery: OidcDiscovery;
  clientSecret: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const response = await fetch(input.discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: input.discovery.client_id,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token refresh failed: HTTP ${response.status}${text ? `: ${text}` : ""}`);
  }
  return (await response.json()) as TokenResponse;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/** Asymmetric only: an HMAC ("HS*") ID token would be keyed with the client
 * secret, which this BFF never wants to be the thing that proves identity. */
const ID_TOKEN_ALGORITHMS = [
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA",
];

/**
 * OIDC Core §3.1.3.7 ID-token validation (GATE-0 B21 / S11): signature
 * against the realm's JWKS, `iss`, `aud` (and `azp` when there are several
 * audiences), `exp`, and the `nonce` this browser transaction sent. Throws on
 * any mismatch; the callback turns that into a failed login.
 */
export async function verifyIdToken(input: {
  idToken: string;
  discovery: OidcDiscovery;
  nonce: string;
}): Promise<JWTPayload> {
  const { discovery } = input;
  let jwks = jwksCache.get(discovery.jwks_uri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
    jwksCache.set(discovery.jwks_uri, jwks);
  }
  const { payload } = await jwtVerify(input.idToken, jwks, {
    issuer: discovery.issuer,
    audience: discovery.client_id,
    algorithms: ID_TOKEN_ALGORITHMS,
    requiredClaims: ["exp", "iat", "sub", "nonce"],
  });
  if (payload.nonce !== input.nonce) throw new Error("ID token nonce mismatch");
  if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== discovery.client_id) {
    throw new Error("ID token azp mismatch");
  }
  return payload;
}
