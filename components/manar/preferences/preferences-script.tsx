import { preferencesScriptSource } from "./preference-storage";

export interface PreferencesScriptProps {
  /** Tenant slug of the signed-in session, or undefined when signed out. */
  scope: string;
  /** The request's CSP nonce (proxy.ts); without it the browser refuses the script. */
  nonce?: string;
}

/**
 * The blocking inline `<script>` that puts the operator's persisted
 * density and theme on `<html>` while the browser is still parsing the
 * document — before the first paint, and before React exists.
 *
 * This is the pattern Next.js documents for exactly this problem
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md,
 * "Themes"): the server has no access to `localStorage`, so it emits a
 * neutral default, and a synchronous script in `<head>` corrects the DOM
 * before anything is painted. `<html>` already carries
 * `suppressHydrationWarning` (app/[locale]/layout.tsx), which is what
 * tells React to keep the DOM the script produced rather than treating
 * the difference as a hydration error and re-rendering the subtree.
 *
 * `type` flips to `text/plain` on the client so React's development-mode
 * warning about rendering `<script>` tags stays quiet and the script is
 * inert if it is ever re-inserted by a client render — it has already
 * done its job on the server-parsed pass.
 */
export function PreferencesScript({ scope, nonce }: PreferencesScriptProps) {
  return (
    <script
      nonce={nonce}
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: preferencesScriptSource(scope) }}
    />
  );
}
