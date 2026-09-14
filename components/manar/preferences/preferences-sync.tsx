"use client";

import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { useUiStore } from "@/lib/stores/ui-store";

/**
 * Keeps `html[data-density]` equal to the persisted store value.
 *
 * Renders nothing, so it cannot itself cause a hydration mismatch, and it
 * is mounted from the locale root layout so it covers the login screen as
 * well as the app shell.
 *
 * Two jobs:
 *
 *  - Apply a density change the moment the operator picks one, without
 *    every consumer subscribing to the store.
 *  - Re-apply on mount. `preferences-script.tsx` already set the
 *    attribute during parsing, so this is redundant in production — but
 *    React's Strict Mode remounts once in development and resets
 *    `<html>` to only the attributes it manages from JSX, which drops
 *    the script's. Next's own guide calls this out and prescribes
 *    re-applying it from a layout effect in the component that owns the
 *    preference (preventing-flash-before-hydration.md, "Re-applying
 *    attributes in development").
 *
 * A layout effect rather than a plain effect so the write lands before
 * the browser paints the hydrated tree, never one frame after it.
 */
export function PreferencesSync() {
  const density = useUiStore((state) => state.density);

  useIsomorphicLayoutEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  return null;
}
