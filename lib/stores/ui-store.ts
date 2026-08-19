import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Zustand — lightweight, cross-component *UI* state only (Section 57):
 * sidebar collapse, panel/filter state that no server round trip owns.
 * Anything that comes from manar-api belongs in TanStack Query
 * (lib/api/*, hooks that call apiClient), never here — this store must
 * never hold server data or duplicate cache TanStack Query already owns.
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
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
    }),
    {
      name: "manar-ui",
      // Only the collapse preference is a durable choice; mobileNavOpen
      // must always start closed on a fresh load, never restored mid-open.
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
