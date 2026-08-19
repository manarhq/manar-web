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
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "manar-ui" },
  ),
);
