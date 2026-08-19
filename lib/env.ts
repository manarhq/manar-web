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
  // tenant: the realm path segment is the tenant slug the user enters at
  // /login, e.g. `${KEYCLOAK_BASE_URL}/realms/<slug>`.
  KEYCLOAK_BASE_URL: z.url().default("http://localhost:8081"),
  // The same confidential client id manar-api's TenantProvisioningService
  // creates in every tenant realm (docs/human-auth.md).
  KEYCLOAK_CLIENT_ID: z.string().default("manar-api"),
  // Infrastructure-operator master-realm credentials — see
  // docs/auth-flow.md's "Known limitation: client secret retrieval" for
  // why the BFF needs these this phase and what should replace it.
  KEYCLOAK_ADMIN_USERNAME: z.string().default("admin"),
  KEYCLOAK_ADMIN_PASSWORD: z.string().default("admin"),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default("admin-cli"),

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
