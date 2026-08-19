import "server-only";
import { z } from "zod";

/**
 * Server-side environment variable schema.
 *
 * Every server-side env var this app depends on is declared, validated,
 * and typed here, and nothing reads `process.env` directly anywhere else
 * (see docs/dependency-decisions.md's Phase 1 note establishing this
 * pattern). Phase 11a adds the Keycloak/session/API vars the auth BFF and
 * generated-client codegen need — see docs/auth-flow.md for what each one
 * is actually used for and why.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Where manar-api's human-facing HTTP API lives. The BFF proxy
  // (app/api/bff/[...path]) forwards requests here with a server-attached
  // Authorization header; the browser never talks to this origin
  // directly.
  MANAR_API_BASE_URL: z.url().default("http://localhost:3000"),

  // Keycloak (Phase 3: Human Authentication in manar-api). Realm-per-
  // tenant. As of Phase 11b Part 1, manar-web no longer talks to Keycloak
  // directly for discovery or client-secret retrieval — it calls
  // manar-api's `GET /tenants/:slug/oidc-config` (issuer/endpoints/client
  // ID) and `GET /tenants/:slug/oidc-client-secret` (the one sensitive
  // value) instead. See docs/auth-flow.md's "Token exchange: via
  // manar-api, not Keycloak directly" section.
  //
  // Phase 14 security cleanup 2 removed the last reason manar-web held
  // standing Keycloak admin credentials: registering its own OIDC
  // redirect URI against each tenant realm's client
  // (`ensureRedirectUriRegistered`, `lib/auth/keycloak-admin.ts`, now
  // deleted). manar-api's `TenantProvisioningService` registers that same
  // fixed, deployment-wide callback URL at tenant-creation time instead
  // (`MANAR_WEB_BASE_URL`, manar-api-side config) — it was never actually
  // dynamic per-login, so there was nothing that genuinely needed
  // discovering lazily by a browser-facing process. `KEYCLOAK_BASE_URL`
  // and `KEYCLOAK_ADMIN_*` are gone from this schema entirely as a
  // result; manar-web now holds zero Keycloak credentials of any kind.
  // See docs/auth-flow.md.

  // Phase 11b Part 1's narrow, single-purpose shared secret
  // (`manar-api/src/tenants/bff-service.guard.ts`) — authenticates
  // manar-web's BFF to `GET /tenants/:slug/oidc-client-secret`. Known only
  // to manar-api and manar-web's server process; never a tenant JWT role
  // and never Keycloak master-admin credentials.
  MANAR_BFF_SERVICE_TOKEN: z
    .string()
    .min(16, "MANAR_BFF_SERVICE_TOKEN must match manar-api's configured value"),

  // Symmetric key for the encrypted session cookie (see lib/auth/session.ts).
  // Must be at least 32 bytes of entropy; generate with
  // `openssl rand -base64 32`. No safe default — the app refuses to boot
  // without one.
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters (openssl rand -base64 32)"),

  // Public base URL this app is served from, used to build the OIDC
  // redirect_uri. Falls back to constructing it from the incoming request
  // in dev; set explicitly in any deployed environment.
  APP_BASE_URL: z.url().default("http://localhost:3100"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
