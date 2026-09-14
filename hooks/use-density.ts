"use client";

import { DEFAULT_DENSITY, type Density } from "@/components/manar/preferences/preference-storage";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useUiStore } from "@/lib/stores/ui-store";

export interface UseDensityResult {
  /** The operator's density, or the default until hydration has settled. */
  density: Density;
  setDensity: (density: Density) => void;
}

/**
 * Read/write access to the persisted density preference for components
 * that need to *display* it — the topbar menu, and tests.
 *
 * Components that merely need to *look* right in both densities must not
 * use this: they consume the --density-* custom properties in
 * app/globals.css, which are already correct before this hook's first
 * render. This hook exists only where the value itself is the content.
 *
 * The returned value is pinned to the default until mount. zustand's
 * `persist` middleware rehydrates synchronously from `localStorage` when
 * the store module is evaluated, so on the client the very first render
 * would otherwise already see the stored value while the server render
 * saw the default — a hydration mismatch in any component that renders
 * it. Gating on `useHasMounted` keeps the two passes identical.
 */
export function useDensity(): UseDensityResult {
  const stored = useUiStore((state) => state.density);
  const setDensity = useUiStore((state) => state.setDensity);
  const mounted = useHasMounted();

  return { density: mounted ? stored : DEFAULT_DENSITY, setDensity };
}
