# Auth flow

manar-web's implementation of Phase 11a Part 2's "Auth flow" requirement
(`manar-api/docs/superpowers/specs/2026-08-19-phase11a-soc-ui-foundation-design.md`,
Section 67). Standards-based Keycloak OIDC — no password is ever collected
in a form manar-web renders. This document is the "decide and document
your actual approach" the design spec asks for.

## The problem: which realm?

Phase 3 (`manar-api/docs/human-auth.md`) made human auth **realm-per-tenant**:
every tenant gets its own Keycloak realm (`realms/<tenant-slug>`), its own
JWKS, its own confidential `manar-api` client. There is no single shared
login page/realm a browser can redirect to before it knows which tenant
the user belongs to.

## Chosen approach: tenant-slug entry step

`/login` collects one thing — a workspace ID, which is exactly the
tenant's `slug` (== its realm name, per `docs/human-auth.md`: "Realm names
equal the tenant's slug"). Submitting it:

1. `POST /api/auth/login` checks the realm exists (`GET
/realms/<slug>/.well-known/openid-configuration` — Keycloak's own
   unauthenticated discovery endpoint; 404 means "no such workspace").
2. Starts a standard OIDC authorization-code + PKCE redirect to _that_
   realm's real Keycloak login page. The user authenticates entirely on
   Keycloak's UI — manar-web never sees a password.
3. Keycloak redirects back to `/api/auth/callback`, which exchanges the
   code for tokens and establishes a session (see "Token storage" below).

**Alternatives considered:**

- **Subdomain-per-tenant** (`acme.manar.example.com` → realm `acme`) is
  the more common pattern at this scale and avoids the extra click, but
  needs wildcard DNS/TLS this local/foundation deployment doesn't have
  yet. Revisit once there's a real deployment domain — the slug-entry step
  can then become a fallback for direct/bookmarked non-subdomain access
  rather than the only path.
- **Email-domain-to-tenant lookup** (ask for an email first, resolve the
  tenant from its domain) needs a domain→tenant mapping Phase 3 never
  built (and arguably shouldn't: a domain isn't guaranteed unique to one
  tenant). Rejected as unbuilt infrastructure, not a UI decision.
- **A single shared "control" realm brokering into tenant realms**
  (Keycloak identity brokering) is real Keycloak functionality but is
  itself a Phase 3-sized backend change (a broker realm, per-tenant IdP
  configs) — out of scope for a frontend-only phase.

The tenant-slug step is intentionally the least backend-invasive option:
it needs nothing from manar-api beyond what Phase 3 already ships.

## Known limitation: client secret retrieval

Phase 3's confidential `manar-api` client secret is generated once, at
realm-provisioning time, and manar-api exposes **no HTTP endpoint** to
read it back (deliberate — Section 11, no cross-tenant admin surface).
But the browser-facing authorization-code exchange (`/api/auth/callback`)
needs that secret to authenticate at the token endpoint.

This phase's BFF (`lib/auth/keycloak-admin.ts`) fetches it directly from
**Keycloak's own Admin API**, using the same infrastructure-operator
master-realm credentials (`KEYCLOAK_ADMIN_USERNAME`/`PASSWORD`) that
manar-api's `TenantProvisioningService` and
`test/support/keycloak-test-helpers.ts` already trust. Nothing in
manar-api's code, database, or config changes to make this work, and the
secret already sits at this trust level in the control DB's
`SecretReference` table today.

This is flagged as a deliberate interim posture, not a lost decision: a
browser-facing BFF process holding infrastructure-operator Keycloak admin
credentials is more privilege than it should carry long-term. A follow-up
phase should add either a narrow, scoped manar-api endpoint that returns
just the one secret a legitimate BFF needs, or move secret retrieval to
a direct OpenBao read once Phase 4/17's `OpenBaoSecretProvider` lands.

The same module also lazily registers manar-web's own OIDC `redirect_uri`
against each tenant realm's client the first time it's needed (Phase 3
created the client with no `redirectUris`, since it didn't know
manar-web's callback URL yet) — a production deployment should provision
this as part of tenant onboarding instead; see that function's doc
comment.

## Token storage: encrypted, server-only session cookie (BFF pattern)

Researched current guidance before choosing this (RFC 9700 / OAuth 2.0
Security Best Current Practice, and the "token handler"/BFF pattern
several current write-ups converge on for browser-based apps in 2026 —
see this session's research). The clear consensus: **never** put an
access or refresh token anywhere JavaScript can read it (`localStorage`,
`sessionStorage`, a non-`httpOnly` cookie) — any XSS in the app can then
exfiltrate a long-lived bearer token for replay outside the browser
entirely. The `localStorage`-token SPA pattern many older tutorials still
show is explicitly the pattern this guidance says to move away from.

manar-web uses the **BFF (backend-for-frontend) / token-handler** pattern:

- `/api/auth/callback` encrypts the full token set (access, refresh, ID
  token) into a single `httpOnly`, `Secure` (in production),
  `SameSite=Lax` cookie (`manar_session`) using `jose`'s `EncryptJWT`
  (JWE, `dir` / `A256GCM`, keyed from `SESSION_SECRET`). The browser
  receives this cookie and **nothing else** — no token ever appears in a
  response body, a URL, or a cookie JavaScript can read.
- Every API call the browser makes goes through the generated client
  (`lib/api/client.ts`), whose `baseUrl` is `/api/bff`, **never**
  manar-api's origin directly. `app/api/bff/[...path]/route.ts` is the
  one and only place that decrypts the session cookie and attaches the
  real `Authorization: Bearer <token>` header before forwarding to
  manar-api — including the SSE live-events stream `/overview` subscribes
  to (the proxy streams the response body through unmodified, so it works
  identically for JSON endpoints and `text/event-stream`).
- **Refresh** happens on demand at that same boundary: before forwarding,
  the proxy checks the access token's `exp`; if it's expired and a
  refresh token is still valid, it calls Keycloak's token endpoint
  (`grant_type=refresh_token`) and re-encrypts the session cookie on the
  response. There's no separate background refresh job.
- `proxy.ts` (route protection) only checks that a _plausible,
  not-fully-expired_ session cookie exists before letting a request
  through to a protected route — it never calls out to Keycloak itself,
  keeping it cheap per Next's own guidance on what belongs in Proxy vs. a
  route handler.
- An absolute 12-hour session cap (`SESSION_MAX_AGE_SECONDS` in
  `lib/auth/session.ts`) applies regardless of refresh-token lifetime —
  defense in depth against an indefinitely-lived session.

**Trade-off, stated plainly:** an XSS vulnerability in manar-web can still
call manar-api _as the logged-in user_ while their session is active
(since the BFF will happily attach a real Authorization header to any
request it receives) — the BFF pattern doesn't eliminate that risk, it
eliminates token _exfiltration_ (replay outside the browser, after the
session ends, from an attacker's own machine). That's the trade-off
RFC 9700's guidance accepts as the realistic ceiling for a browser app
talking to its own backend.

## PKCE, even with a confidential client

`/api/auth/login` generates a PKCE (`code_verifier`/`S256` challenge) pair
for every login attempt, despite the client also authenticating with a
client secret. This is current baseline guidance (not just a public-client
requirement): PKCE binds the authorization code to the specific browser
transaction that started it, which client-secret auth alone does not.

## What proxy.ts protects

Every route under `/[locale]/(app)/*` (i.e. everything except `/login`)
requires a valid session; `proxy.ts` redirects to `/login?from=<path>`
otherwise (and drops any stale session cookie in the process). `/login`
itself, `/api/auth/*`, `/api/health`, and Next's own static asset routes
are the only paths proxy.ts lets through unauthenticated.

## Known limitation: `/api/auth/logout` doesn't revoke the cookie server-side

The session cookie is a stateless, self-contained JWE — there is no server-
side session store to invalidate. `/api/auth/logout` deletes the cookie
from the browser and redirects to Keycloak's real `end_session_endpoint`
(so the Keycloak-side realm session actually ends too), but a _copy_ of
the old cookie value, if one existed outside the browser (e.g. captured in
transit before this phase's HTTPS is in place, or replayed from a proxy
log), would still decrypt successfully and grant access until its own
`exp` claim (bounded by the 12-hour absolute cap). This is the accepted
trade-off of a stateless BFF session — a future phase that wants true
server-side revocation-on-logout would need a session store (e.g. a
Redis-backed denylist keyed by a session ID embedded in the cookie) rather
than a self-contained JWE alone.
