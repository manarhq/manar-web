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

  // Sign-in (spec 4.1): one shared realm, no tenant slug. `OIDC_ISSUER` is the realm's issuer URL
  // (https://auth-manar.fixio.ae/realms/manar); a customer-hosted install points it at its own realm.
  // The confidential client's secret is this app's own (ExternalSecret), so no API endpoint hands
  // client secrets out any more and manar-web holds no Keycloak admin credentials.
  OIDC_ISSUER: z.url().default("http://localhost:8081/realms/manar"),
  OIDC_CLIENT_ID: z.string().min(1).default("manar-api"),
  OIDC_CLIENT_SECRET: z.string().min(8, "OIDC_CLIENT_SECRET is required"),

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

  // Public product site (marketing), linked from the public profile card. Runtime, server-only.
  PUBLIC_SITE_URL: z.url().default("https://manar.fixio.ae"),

  // Preview switch for the personal shell: forces the workspace kind the shell is chosen from
  // (lib/workspace-kind.ts). Honoured outside production only; the real value comes from the
  // session (workspaceKind, set by the identity track from manar-api's auth context).
  // Community link (Discord invite), shown in the user menu and help. Empty = no link is shown.
  MANAR_DISCORD_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.url().optional(),
  ),

  // Cloudflare Turnstile site key for the appeal form (public; the secret stays in manar-api).
  // Cloudflare's always-pass test key outside production when unset.
  TURNSTILE_SITE_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.string().optional(),
  ),

  MANAR_WORKSPACE_KIND_OVERRIDE: z.enum(["PERSONAL", "COMPANY", "SAMPLE"]).optional(),
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
