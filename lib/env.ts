import { z } from "zod";

/**
 * Server-side environment variable schema.
 *
 * This app only needs `NODE_ENV` at this stage of the project. The point of
 * this module isn't the (currently tiny) schema itself — it's establishing
 * the pattern: every server-side env var this app depends on is declared,
 * validated, and typed here, and nothing reads `process.env` directly
 * anywhere else. Later phases (e.g. API base URLs, Keycloak config) extend
 * `envSchema` instead of reaching for `process.env` ad hoc.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
