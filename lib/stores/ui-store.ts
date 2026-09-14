import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_DENSITY,
  readPreferenceScopeFromDom,
  uiStoreStorageKey,
  type Density,
} from "@/components/manar/preferences/preference-storage";

/**
 * Zustand — lightweight, cross-component *UI* state only (Section 57):
 * sidebar collapse, interface density, panel/filter state that no server
 * round trip owns. Anything that comes from manar-api belongs in TanStack
 * Query (lib/api/*, hooks that call apiClient), never here — this store
 * must never hold server data or duplicate cache TanStack Query already
 * owns.
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Narrow-viewport (<sm) nav drawer open state — see components/manar/
   * sidebar.tsx and topbar.tsx. Deliberately NOT persisted (unlike
   * sidebarCollapsed above): a drawer left open is a transient viewport
   * interaction, not a preference that should survive a reload. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  /** Interface density — comfortable (default) or compact. Persisted.
   * The value here is only half the story: the attribute it drives
   * (`html[data-density]`) is applied before first paint by
   * components/manar/preferences/preferences-script.tsx and kept in sync
   * afterwards by preferences-sync.tsx. Components must never read this
   * value to branch on density — they consume the --density-* custom
   * properties in app/globals.css instead. */
  density: Density;
  setDensity: (density: Density) => void;
}

/**
 * Resolved once, at module evaluation, from the `data-pref-scope`
 * attribute app/[locale]/layout.tsx server-renders onto `<html>` — see
 * components/manar/preferences/preference-storage.ts for why the key is
 * tenant-scoped at all. Module evaluation happens when the first client
 * component importing this store loads, which is after the browser has
 * parsed `<html>`, so the attribute is always there by then; during SSR
 * it resolves to the anonymous scope, which is harmless because
 * `persist` does not touch storage on the server.
 *
 * Exported so tests can assert the store and the pre-paint script agree
 * on the key instead of re-deriving it by hand.
 */
export const UI_STORE_STORAGE_KEY = uiStoreStorageKey(readPreferenceScopeFromDom());

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
      density: DEFAULT_DENSITY,
      setDensity: (density) => set({ density }),
    }),
    {
      name: UI_STORE_STORAGE_KEY,
      // Durable operator choices only; mobileNavOpen must always start
      // closed on a fresh load, never restored mid-open.
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
      }),
    },
  ),
);
