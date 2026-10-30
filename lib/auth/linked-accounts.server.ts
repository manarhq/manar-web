import "server-only";

import { env } from "@/lib/env";
import type { SessionPayload } from "@/lib/auth/session";
import { freshAccessToken } from "@/lib/auth/token.server";

export interface SignInMethods {
  microsoft: boolean;
  github: boolean;
  /** The real email address, when one is linked (Microsoft and GitHub users carry a placeholder). */
  email: string | null;
}

const PLACEHOLDER_EMAIL_DOMAIN = "@idp.invalid";

/**
 * Which sign-in methods are linked to the signed-in user, read from the user's own Keycloak
 * account API with their access token (`GET <issuer>/account/linked-accounts`, `GET <issuer>/account`).
 * Returns null if Keycloak cannot be read: the page says so instead of guessing.
 */
export async function getSignInMethods(session: SessionPayload): Promise<SignInMethods | null> {
  try {
    const token = freshAccessToken(session);
    if (!token) return null;
    const base = env.OIDC_ISSUER.replace(/\/+$/, "");
    const get = (path: string) =>
      fetch(`${base}/account${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
    const [linked, profile] = await Promise.all([get("/linked-accounts"), get("")]);
    if (!linked.ok || !profile.ok) return null;
    const accounts = (await linked.json()) as { providerAlias: string; connected: boolean }[];
    const { email } = (await profile.json()) as { email?: string };
    const has = (alias: string) => accounts.some((a) => a.providerAlias === alias && a.connected);
    return {
      microsoft: has("microsoft"),
      github: has("github"),
      email: email && !email.endsWith(PLACEHOLDER_EMAIL_DOMAIN) ? email : null,
    };
  } catch (error) {
    console.error("Reading sign-in methods failed", error);
    return null;
  }
}
