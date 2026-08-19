import "server-only";

import { randomBytes, createHash } from "node:crypto";

import { env } from "@/lib/env";

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
}

const discoveryCache = new Map<string, OidcDiscovery>();

/** Fetches (and caches) a tenant realm's OIDC discovery document. The
 * `issuer` this returns is exactly the value manar-api's `JwtAuthGuard`
 * expects to see in a token's `iss` claim (docs/human-auth.md) — realm
 * names equal tenant slugs, so this is effectively how the frontend
 * confirms "this tenant slug maps to a real, provisioned realm" before
 * ever redirecting the browser to it. */
export async function discoverRealm(realm: string): Promise<OidcDiscovery> {
  const cached = discoveryCache.get(realm);
  if (cached) return cached;

  const response = await fetch(
    `${env.KEYCLOAK_BASE_URL}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`No OIDC discovery document for realm "${realm}" (HTTP ${response.status})`);
  }
  const discovery = (await response.json()) as OidcDiscovery;
  discoveryCache.set(realm, discovery);
  return discovery;
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
}): string {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("client_id", env.KEYCLOAK_CLIENT_ID);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
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
      client_id: env.KEYCLOAK_CLIENT_ID,
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
      client_id: env.KEYCLOAK_CLIENT_ID,
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
