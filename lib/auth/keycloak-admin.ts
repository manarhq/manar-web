import "server-only";

import { env } from "@/lib/env";

/**
 * Talks to Keycloak's own Admin REST API — never to manar-api — using the
 * infrastructure-operator master-realm credentials
 * (`KEYCLOAK_ADMIN_USERNAME`/`PASSWORD`, matching manar-api's
 * `TenantProvisioningService`/`test/support/keycloak-test-helpers.ts`).
 *
 * ## Known limitation: client secret retrieval
 *
 * Phase 3 (`manar-api/docs/human-auth.md`) creates a confidential
 * `manar-api` client in every tenant realm and explicitly notes its
 * generated secret is "captured now because Keycloak only
 * returns/generates it once, at client-creation time, and Phase 11's
 * login flow will need it" — but manar-api exposes no HTTP endpoint to
 * read that secret back (by design: no cross-tenant admin surface,
 * Section 11). So for this foundation phase, the BFF fetches it directly
 * from Keycloak's Admin API instead, using the same master-realm
 * credentials manar-api's own provisioning code already trusts.
 *
 * This is a deliberate interim posture, not a lost decision: it works
 * (nothing in manar-api's code, DB, or config changes), it doesn't
 * introduce a new plaintext-secret-at-rest problem (the secret already
 * lives in the control DB's `SecretReference` table at the same trust
 * level per `docs/human-auth.md`), and it doesn't widen who can log in as
 * whom (Keycloak, not this code, still owns credential verification). But
 * a browser-facing BFF process holding infrastructure-operator admin
 * credentials is not where this should end up — a follow-up phase should
 * add a narrow, scoped manar-api endpoint (or a direct OpenBao read, once
 * Phase 4/17's `OpenBaoSecretProvider` lands) that returns just the one
 * secret a legitimate BFF needs, without the master admin token this
 * module currently requires.
 */

interface CachedSecret {
  value: string;
  fetchedAt: number;
}

const clientSecretCache = new Map<string, CachedSecret>();
const CLIENT_SECRET_CACHE_TTL_MS = 5 * 60_000;
const ensuredRedirectUris = new Set<string>();

let masterAdminToken: { token: string; expiresAt: number } | null = null;

async function getMasterAdminToken(): Promise<string> {
  if (masterAdminToken && masterAdminToken.expiresAt > Date.now() + 5_000) {
    return masterAdminToken.token;
  }

  const response = await fetch(
    `${env.KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: env.KEYCLOAK_ADMIN_CLIENT_ID,
        username: env.KEYCLOAK_ADMIN_USERNAME,
        password: env.KEYCLOAK_ADMIN_PASSWORD,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to obtain Keycloak master admin token: HTTP ${response.status}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  masterAdminToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return masterAdminToken.token;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getMasterAdminToken();
  const response = await fetch(`${env.KEYCLOAK_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Keycloak Admin API ${init.method ?? "GET"} ${path} failed: HTTP ${response.status}${text ? `: ${text}` : ""}`,
    );
  }
  return response;
}

/** Realm existence check — used by /api/auth/login to distinguish "no
 * such tenant/realm" from other failures before starting the OIDC
 * redirect. Uses the *unauthenticated* discovery endpoint, not the admin
 * API, since that's a legitimate public check any client can make. */
export async function realmExists(realm: string): Promise<boolean> {
  const response = await fetch(
    `${env.KEYCLOAK_BASE_URL}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`,
    {
      cache: "no-store",
    },
  );
  return response.ok;
}

interface KeycloakClientSummary {
  id: string;
  clientId: string;
  redirectUris?: string[];
  webOrigins?: string[];
}

async function findClient(realm: string, clientId: string): Promise<KeycloakClientSummary> {
  const response = await adminFetch(
    `/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(clientId)}`,
  );
  const clients = (await response.json()) as KeycloakClientSummary[];
  const client = clients[0];
  if (!client) {
    throw new Error(`Keycloak client "${clientId}" not found in realm "${realm}"`);
  }
  return client;
}

/**
 * Returns the tenant realm's `manar-api` confidential client secret,
 * cached briefly in-process (see the module doc comment above for why
 * this is fetched here at all). Server-process memory only — never
 * written to a cookie, log line, or response body.
 */
export async function getTenantClientSecret(realm: string): Promise<string> {
  const cached = clientSecretCache.get(realm);
  if (cached && Date.now() - cached.fetchedAt < CLIENT_SECRET_CACHE_TTL_MS) {
    return cached.value;
  }

  const client = await findClient(realm, env.KEYCLOAK_CLIENT_ID);
  const secretResponse = await adminFetch(
    `/admin/realms/${encodeURIComponent(realm)}/clients/${client.id}/client-secret`,
  );
  const body = (await secretResponse.json()) as { value?: string };
  if (!body.value) {
    throw new Error(
      `Keycloak did not return a client secret for client "${env.KEYCLOAK_CLIENT_ID}" in realm "${realm}"`,
    );
  }

  clientSecretCache.set(realm, { value: body.value, fetchedAt: Date.now() });
  return body.value;
}

/**
 * Phase 3 created the `manar-api` client with no `redirectUris` (it
 * didn't know manar-web's callback URL yet — see manar-api's
 * `keycloak-admin.client.ts`). Standard Flow rejects any redirect Keycloak
 * hasn't allow-listed, so the BFF idempotently registers its own callback
 * URL the first time it needs a given realm, then caches that it's done
 * so per process. A production deployment should provision this as part
 * of tenant onboarding instead of doing it lazily from a login attempt;
 * flagged here alongside the client-secret limitation above as the same
 * class of "local-dev-pragmatic, not production-final" shortcut.
 */
export async function ensureRedirectUriRegistered(
  realm: string,
  redirectUri: string,
  webOrigin: string,
): Promise<void> {
  const cacheKey = `${realm}:${redirectUri}`;
  if (ensuredRedirectUris.has(cacheKey)) return;

  const client = await findClient(realm, env.KEYCLOAK_CLIENT_ID);
  const redirectUris = new Set(client.redirectUris ?? []);
  const webOrigins = new Set(client.webOrigins ?? []);

  if (redirectUris.has(redirectUri) && webOrigins.has(webOrigin)) {
    ensuredRedirectUris.add(cacheKey);
    return;
  }

  redirectUris.add(redirectUri);
  webOrigins.add(webOrigin);

  await adminFetch(`/admin/realms/${encodeURIComponent(realm)}/clients/${client.id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...client,
      redirectUris: [...redirectUris],
      webOrigins: [...webOrigins],
    }),
  });

  ensuredRedirectUris.add(cacheKey);
}
