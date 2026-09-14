/**
 * The one place the two operator preferences this console persists —
 * interface density and colour theme — agree on WHERE they are stored and
 * WHAT the stored shape looks like.
 *
 * Four different pieces of code have to reach the same answer:
 *
 *   1. `preferences-script.tsx`, a blocking inline `<script>` in `<head>`
 *      that reads storage during HTML parsing so the correct density and
 *      theme are on `<html>` BEFORE the first paint (see
 *      node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 *      — an effect, even `useLayoutEffect`, is too late: it runs after
 *      hydration, and on a slow connection the browser has already
 *      painted the server HTML by then).
 *   2. `lib/stores/ui-store.ts`, whose zustand `persist` middleware owns
 *      the density value.
 *   3. `app/providers.tsx`, which hands next-themes its `storageKey`.
 *   4. `__tests__/`, which asserts 1 and 2 actually agree rather than
 *      trusting that two hand-written string templates match.
 *
 * TENANT SCOPING. `localStorage` is per-origin, and this console serves
 * every tenant from ONE origin (the tenant comes from the session cookie,
 * not the hostname or the path — see lib/auth/session.ts). A single fixed
 * key would therefore carry one tenant's operator preferences into the
 * next tenant signed in on the same browser profile, which is exactly
 * what "must not leak across tenants" rules out. Both keys are suffixed
 * with the signed-in tenant slug, which `app/[locale]/layout.tsx` renders
 * onto `<html data-pref-scope>` so the pre-paint script (server-rendered,
 * so it can be told the scope directly) and the client store (which reads
 * it back off the DOM) derive the same key. Signed-out surfaces — the
 * login page — use `anon`.
 *
 * Note this is scoping, not secrecy: `localStorage` remains readable by
 * anything running on the origin. Neither preference contains tenant data
 * (they are two enum values), so the property being protected is "one
 * tenant's session does not inherit another's UI state", not
 * confidentiality.
 */

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

/** The default, and what a document with no `data-density` renders as. */
export const DEFAULT_DENSITY: Density = "comfortable";

export function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (DENSITIES as readonly string[]).includes(value);
}

/** `<html data-pref-scope>` — the `dataset` key is the camelCase form. */
export const PREFERENCE_SCOPE_DATASET_KEY = "prefScope";
export const ANONYMOUS_PREFERENCE_SCOPE = "anon";

/**
 * Tenant slugs are already constrained to `[a-z0-9-]` at login
 * (app/api/auth/login/route.ts's `TENANT_SLUG_PATTERN`); re-validating
 * here rather than trusting that means the value interpolated into the
 * inline script below can never be anything else, whatever a future
 * caller passes.
 */
const SAFE_SCOPE = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function normalizePreferenceScope(scope: string | null | undefined): string {
  if (!scope) return ANONYMOUS_PREFERENCE_SCOPE;
  return SAFE_SCOPE.test(scope) ? scope : ANONYMOUS_PREFERENCE_SCOPE;
}

/** zustand-persist key for lib/stores/ui-store.ts. */
export function uiStoreStorageKey(scope: string): string {
  return `manar-ui:${normalizePreferenceScope(scope)}`;
}

/** next-themes `storageKey`. */
export function themeStorageKey(scope: string): string {
  return `manar-theme:${normalizePreferenceScope(scope)}`;
}

/** Reads the scope the server rendered onto `<html>`. Returns the
 * anonymous scope during SSR and on any document that predates the
 * attribute, so this never throws and never returns `undefined`. */
export function readPreferenceScopeFromDom(): string {
  if (typeof document === "undefined") return ANONYMOUS_PREFERENCE_SCOPE;
  return normalizePreferenceScope(document.documentElement.dataset[PREFERENCE_SCOPE_DATASET_KEY]);
}

/**
 * Source of the blocking inline script described at the top of this file.
 *
 * Density is read out of the zustand-persist envelope
 * (`{"state":{...},"version":n}`) rather than a second, parallel key, so
 * there is exactly one source of truth for it and no window in which the
 * script and the store disagree. Theme deliberately duplicates the small
 * amount of logic next-themes' own script performs: next-themes renders
 * its script inside `<body>` (that is where `<ThemeProvider>` lives),
 * which is late enough that a slow first paint can show the wrong theme,
 * whereas this one is in `<head>`. The two agree by construction — same
 * key, same `"system"` fallback, same resolved class — so next-themes
 * hydrating afterwards is a no-op rather than a second, visible switch.
 *
 * Everything is wrapped so that a browser with storage disabled (private
 * mode, a locked-down profile) still gets the defaults applied instead of
 * an unstyled document.
 */
export function preferencesScriptSource(scope: string): string {
  const uiKey = JSON.stringify(uiStoreStorageKey(scope));
  const themeKey = JSON.stringify(themeStorageKey(scope));
  return `(function(){var e=document.documentElement;var d=${JSON.stringify(DEFAULT_DENSITY)};try{var r=localStorage.getItem(${uiKey});if(r){var v=JSON.parse(r);v=v&&v.state&&v.state.density;if(v==="compact"||v==="comfortable")d=v}}catch(x){}e.setAttribute("data-density",d);try{var t=localStorage.getItem(${themeKey});if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}e.classList.remove("light","dark");e.classList.add(t);e.style.colorScheme=t}catch(x){}})()`;
}
