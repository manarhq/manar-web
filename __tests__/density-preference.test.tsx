import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DENSITY,
  preferencesScriptSource,
  themeStorageKey,
  uiStoreStorageKey,
} from "@/components/manar/preferences/preference-storage";
import { PreferencesSync } from "@/components/manar/preferences/preferences-sync";
import { DensityMenu } from "@/components/manar/preferences/density-menu";
import { UI_STORE_STORAGE_KEY, useUiStore } from "@/lib/stores/ui-store";
import settingsEn from "@/messages/en/settings.json";
import settingsAr from "@/messages/ar/settings.json";

/** jsdom implements neither of these; base-ui's menu positioning and the
 * pre-paint script's system-theme probe both need them. */
function installBrowserStubs() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  if (!("ResizeObserver" in globalThis)) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  }
}

beforeEach(() => {
  installBrowserStubs();
  localStorage.clear();
  document.documentElement.removeAttribute("data-density");
  delete document.documentElement.dataset.prefScope;
  useUiStore.setState({ density: DEFAULT_DENSITY });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("density preference — store and persistence", () => {
  it("defaults to comfortable", () => {
    expect(DEFAULT_DENSITY).toBe("comfortable");
    expect(useUiStore.getState().density).toBe("comfortable");
  });

  it("persists a change to localStorage under the store's key", () => {
    useUiStore.getState().setDensity("compact");

    const raw = localStorage.getItem(UI_STORE_STORAGE_KEY);
    expect(raw, `nothing written to ${UI_STORE_STORAGE_KEY}`).not.toBeNull();
    expect(JSON.parse(raw!).state.density).toBe("compact");
  });

  it("does not persist transient state alongside it", () => {
    useUiStore.getState().setMobileNavOpen(true);
    useUiStore.getState().setDensity("compact");

    const persisted = JSON.parse(localStorage.getItem(UI_STORE_STORAGE_KEY)!).state;
    expect(persisted).toHaveProperty("density");
    expect(persisted).toHaveProperty("sidebarCollapsed");
    expect(persisted).not.toHaveProperty("mobileNavOpen");
  });
});

describe("density preference — tenant scoping", () => {
  it("keys storage by the tenant the server rendered onto <html>", async () => {
    document.documentElement.dataset.prefScope = "acme";
    vi.resetModules();
    const store = await import("@/lib/stores/ui-store");

    expect(store.UI_STORE_STORAGE_KEY).toBe("manar-ui:acme");
    store.useUiStore.getState().setDensity("compact");
    expect(JSON.parse(localStorage.getItem("manar-ui:acme")!).state.density).toBe("compact");
  });

  it("does not inherit another tenant's preference", async () => {
    // globex chose compact on this browser profile earlier.
    localStorage.setItem(
      uiStoreStorageKey("globex"),
      JSON.stringify({ state: { density: "compact", sidebarCollapsed: true }, version: 0 }),
    );
    document.documentElement.dataset.prefScope = "acme";
    vi.resetModules();
    const store = await import("@/lib/stores/ui-store");

    expect(store.useUiStore.getState().density).toBe("comfortable");
    expect(store.useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it("falls back to the anonymous scope when signed out, and rejects a malformed scope", () => {
    expect(uiStoreStorageKey("")).toBe("manar-ui:anon");
    expect(uiStoreStorageKey("../evil")).toBe("manar-ui:anon");
    expect(themeStorageKey("acme")).toBe("manar-theme:acme");
  });
});

describe("density preference — applied to the document", () => {
  it("the pre-paint script reads what the store wrote and sets data-density", () => {
    document.documentElement.dataset.prefScope = "acme";
    // Write through the real store so the script is tested against the
    // actual zustand-persist envelope, not a hand-rolled fixture.
    localStorage.setItem(
      uiStoreStorageKey("acme"),
      JSON.stringify({ state: { density: "compact", sidebarCollapsed: false }, version: 0 }),
    );

    new Function(preferencesScriptSource("acme"))();

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
  });

  it("the pre-paint script falls back to comfortable with no stored value", () => {
    new Function(preferencesScriptSource("acme"))();
    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
  });

  it("the pre-paint script still applies a density when storage throws", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    try {
      new Function(preferencesScriptSource("acme"))();
    } finally {
      getItem.mockRestore();
    }
    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
  });

  it("PreferencesSync applies the current value and follows later changes", () => {
    render(<PreferencesSync />);
    expect(document.documentElement.dataset.density).toBe("comfortable");

    act(() => useUiStore.getState().setDensity("compact"));
    expect(document.documentElement.dataset.density).toBe("compact");

    act(() => useUiStore.getState().setDensity("comfortable"));
    expect(document.documentElement.dataset.density).toBe("comfortable");
  });
});

function renderMenu(locale: "en" | "ar", messages: Record<string, unknown>) {
  return render(
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <NextIntlClientProvider locale={locale} messages={{ settings: messages }}>
        <DensityMenu />
      </NextIntlClientProvider>
    </div>,
  );
}

describe("density preference — the topbar control", () => {
  it("exposes both options and switches the store (English)", async () => {
    renderMenu("en", settingsEn);

    const trigger = screen.getByRole("button", { name: "Change interface density" });
    fireEvent.click(trigger);

    const compact = await screen.findByRole("menuitemradio", { name: "Compact" });
    expect(await screen.findByRole("menuitemradio", { name: "Comfortable" })).toBeInTheDocument();

    fireEvent.click(compact);
    expect(useUiStore.getState().density).toBe("compact");
  });

  it("renders the real Arabic strings, not English placeholders", async () => {
    renderMenu("ar", settingsAr);

    const trigger = screen.getByRole("button", { name: "تغيير كثافة الواجهة" });
    fireEvent.click(trigger);

    expect(await screen.findByRole("menuitemradio", { name: "مريحة" })).toBeInTheDocument();
    expect(await screen.findByRole("menuitemradio", { name: "مضغوطة" })).toBeInTheDocument();
    // Guards against the "translated file, English values" failure mode.
    expect(screen.queryByText("Comfortable")).toBeNull();
  });
});
