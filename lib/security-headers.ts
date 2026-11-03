/**
 * Strict headers for every response (same bar as manar-admin). Scripts need the per-request nonce
 * set in proxy.ts; styles allow inline because Base UI positions popovers with style attributes.
 * No third-party origins: fonts are self-hosted by next/font and every API call goes through the
 * BFF. `form-action`: forms post only to this site, and the sign-in, sign-out and step-up forms
 * are then redirected to the identity provider, whose origin (one shared realm host) is allowed
 * too; browsers check form-action on those redirects.
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
    `form-action 'self'${issuerOrigin ? ` ${issuerOrigin}` : ""}`,
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
