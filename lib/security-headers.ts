/**
 * Origins Keycloak's realm "manar" brokers to straight from a form POST, with no page in between.
 * Keep in step with the realm's identity providers (manar-infra platform/keycloak/realm-manar.yaml).
 * Microsoft's "common" endpoint answers with its own page (prompt=select_account), so its later hop
 * to login.live.com is a new navigation and needs no entry here.
 */
export const BROKERED_IDP_ORIGINS = [
  "https://github.com",
  "https://login.microsoftonline.com",
] as const;

/**
 * Strict headers for every response (same bar as manar-admin). Scripts need the per-request nonce
 * set in proxy.ts; styles allow inline because Base UI positions popovers with style attributes.
 * No third-party origins: fonts are self-hosted by next/font and every API call goes through the
 * BFF. `form-action`: forms post only to this site, and the sign-in, sign-out, step-up and
 * link-account forms are then redirected to the identity provider, whose origin (one shared realm
 * host) is allowed too. Chrome checks form-action on every redirect of a form navigation, so the
 * providers Keycloak brokers to (kc_idp_hint, idp_link) must be listed as well.
 */
export function contentSecurityPolicy(
  nonce: string,
  dev: boolean,
  https = !dev,
  /** Origin of the identity provider (`OIDC_ISSUER`), e.g. https://auth.example. */
  issuerOrigin?: string,
): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    ["form-action 'self'", issuerOrigin, ...BROKERED_IDP_ORIGINS].filter(Boolean).join(" "),
    // Only when served over TLS: on a plain-HTTP preview it would break every asset.
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};
