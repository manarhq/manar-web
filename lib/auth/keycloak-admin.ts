import "server-only";

import { env } from "@/lib/env";

/**
 * Talks to Keycloak's own Admin REST API — never to manar-api — using the
 * infrastructure-operator master-realm credentials
 * (`KEYCLOAK_ADMIN_USERNAME`/`PASSWORD`, matching manar-api's
 * `TenantProvisioningService`/`test/support/keycloak-test-helpers.ts`).
 *
 * ## Phase 11b Part 1 narrowed this module's job
 *
 * This module used to *also* fetch the tenant realm's confidential client
 * secret directly from Keycloak's Admin API (the "Known limitation:
 * client secret retrieval" this doc comment used to describe) — a real
 * credential-hygiene smell: a browser-facing BFF process holding
 * infrastructure-operator admin credentials just to read back one
 * already-generated secret. Phase 11b Part 1 closed that gap on the
 * manar-api side (`GET /tenants/:slug/oidc-client-secret`, gated by a
 * narrow shared `X-Manar-Bff-Token` — see `lib/auth/oidc.ts`'s
 * `getTenantClientSecret`, which replaced this module's old function of
 * the same name) and `GET /tenants/:slug/oidc-config` for discovery
 * (replacing this module's old `realmExists`). See docs/auth-flow.md.
 *
 * What's left here — `ensureRedirectUriRegistered` — is a **separate,
 * still-open** limitation Phase 11b Part 1 did not address: Phase 3's
 * `TenantProvisioningService` creates each tenant realm's confidential
 * client with no `redirectUris`, and manar-api has no endpoint to
 * provision manar-web's callback URL at tenant-onboarding time. Until a
 * follow-up phase adds one, this one narrow admin-API write (updating a
 * client's `redirectUris`/`webOrigins`, never reading a secret) is why
 * `KEYCLOAK_ADMIN_USERNAME`/`PASSWORD` still exist in manar-web's config.
 */

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
 * Phase 3 created the tenant's confidential client with no `redirectUris`
 * (it didn't know manar-web's callback URL yet — see manar-api's
 * `keycloak-admin.client.ts`). Standard Flow rejects any redirect
 * Keycloak hasn't allow-listed, so the BFF idempotently registers its own
 * callback URL the first time it needs a given realm, then caches that
 * it's done so per process. A production deployment should provision
 * this as part of tenant onboarding instead of doing it lazily from a
 * login attempt — see this module's doc comment: Phase 11b Part 1 fixed
 * the sibling client-*secret* workaround this same lazy-provisioning
 * pattern used to share, but not this one.
 *
 * `clientId` is passed in (from `GET /tenants/:slug/oidc-config`'s
 * `clientId` field, resolved once per login attempt) rather than read
 * from a local env default, so this never drifts from what manar-api
 * actually provisioned.
 */
export async function ensureRedirectUriRegistered(
  realm: string,
  clientId: string,
  redirectUri: string,
  webOrigin: string,
): Promise<void> {
  const cacheKey = `${realm}:${redirectUri}`;
  if (ensuredRedirectUris.has(cacheKey)) return;

  const client = await findClient(realm, clientId);
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
