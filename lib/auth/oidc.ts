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
  client_id: string;
}

let discoveryCache: { value: OidcDiscovery; at: number } | null = null;
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

/**
 * The shared realm's endpoints, from its standard discovery document. The document's `issuer`
 * must equal OIDC_ISSUER exactly, so a misconfigured or hijacked URL cannot change who we trust.
 */
export async function discoverIssuer(): Promise<OidcDiscovery> {
  if (discoveryCache && Date.now() - discoveryCache.at < DISCOVERY_TTL_MS) {
    return discoveryCache.value;
  }
  const base = env.OIDC_ISSUER.replace(/\/+$/, "");
  const response = await fetch(`${base}/.well-known/openid-configuration`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`OIDC discovery failed (HTTP ${response.status})`);
  }
  const doc = (await response.json()) as Partial<OidcDiscovery>;
  if (
    doc.issuer?.replace(/\/+$/, "") !== base ||
    !doc.authorization_endpoint ||
    !doc.token_endpoint ||
    !doc.jwks_uri
  ) {
    throw new Error("OIDC discovery document does not match OIDC_ISSUER");
  }
  const value: OidcDiscovery = {
    issuer: doc.issuer,
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
    end_session_endpoint: doc.end_session_endpoint,
    jwks_uri: doc.jwks_uri,
    client_id: env.OIDC_CLIENT_ID,
  };
  discoveryCache = { value, at: Date.now() };
  return value;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

/** PKCE (RFC 7636): binds the authorization code to this browser transaction. */
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

/** The sign-in methods on the login page and the Keycloak alias each one is sent to. */
export const SIGN_IN_METHODS = {
  microsoft: { hint: "microsoft" },
  github: { hint: "github" },
  // The email link is Keycloak's own form (no hint): it asks for the address and mails the link.
  email: { hint: undefined },
} as const;
export type SignInMethod = keyof typeof SIGN_IN_METHODS;

export function isSignInMethod(value: string): value is SignInMethod {
  return Object.hasOwn(SIGN_IN_METHODS, value);
}

export function buildAuthorizationUrl(input: {
  discovery: OidcDiscovery;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** Sign-in method: skips Keycloak's chooser for Microsoft and GitHub. */
  method?: SignInMethod;
  /** Keycloak application-initiated action, e.g. `idp_link:github` (link while signed in). */
  kcAction?: string;
  locale?: string;
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
  const hint = input.method ? SIGN_IN_METHODS[input.method].hint : undefined;
  if (hint) url.searchParams.set("kc_idp_hint", hint);
  if (input.kcAction) url.searchParams.set("kc_action", input.kcAction);
  if (input.locale) url.searchParams.set("ui_locales", input.locale);
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

/** The token endpoint answered with an error status (4xx: the grant is dead; 5xx: try again later). */
export class TokenEndpointError extends Error {
  constructor(
    what: string,
    readonly status: number,
  ) {
    super(`${what} failed: HTTP ${status}`);
    this.name = "TokenEndpointError";
  }
}

async function tokenRequest(
  discovery: OidcDiscovery,
  params: Record<string, string>,
  what: string,
): Promise<TokenResponse> {
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: discovery.client_id,
      client_secret: env.OIDC_CLIENT_SECRET,
      ...params,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    // The body can echo request details: keep the status only.
    throw new TokenEndpointError(what, response.status);
  }
  return (await response.json()) as TokenResponse;
}

export function exchangeCodeForTokens(input: {
  discovery: OidcDiscovery;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  return tokenRequest(
    input.discovery,
    {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    },
    "Token exchange",
  );
}

export function refreshTokens(input: {
  discovery: OidcDiscovery;
  refreshToken: string;
}): Promise<TokenResponse> {
  return tokenRequest(
    input.discovery,
    { grant_type: "refresh_token", refresh_token: input.refreshToken },
    "Token refresh",
  );
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
