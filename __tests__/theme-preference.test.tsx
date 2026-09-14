import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import {
  preferencesScriptSource,
  themeStorageKey,
} from "@/components/manar/preferences/preference-storage";

/**
 * The console used to force dark: `enableSystem={false}` +
 * `defaultTheme="dark"` in app/providers.tsx, plus a literal `dark` class
 * on `<html>` in app/[locale]/layout.tsx, which meant the light palette
 * was unreachable no matter what the operator's machine said. These tests
 * pin the two properties that replaced that: the INITIAL theme comes from
 * the OS preference, and an explicit choice outranks it and survives a
 * reload.
 *
 * They exercise the real `Providers` stack rather than a local copy of
 * its props, so a regression in the actual configuration fails here.
 */

const SCOPE = "acme";
const KEY = themeStorageKey(SCOPE);

/** jsdom ships no matchMedia; next-themes' system-preference detection
 * (and the pre-paint script's) is entirely built on it. */
function mockSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const CHOICES = ["system", "light", "dark"] as const;

/** Reports what next-themes resolved to, and offers the same three
 * choices the topbar's ThemeMenu does — driven by a real click so the
 * test goes through the same path an operator does. */
function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme ?? "—"}</span>
      <span data-testid="resolved">{resolvedTheme ?? "—"}</span>
      {CHOICES.map((choice) => (
        <button key={choice} type="button" onClick={() => setTheme(choice)}>
          {`choose-${choice}`}
        </button>
      ))}
    </>
  );
}

function choose(theme: (typeof CHOICES)[number]) {
  fireEvent.click(screen.getByRole("button", { name: `choose-${theme}` }));
}

function mount() {
  return render(
    <Providers themeStorageKey={KEY}>
      <ThemeProbe />
    </Providers>,
  );
}

function htmlThemeClass(): string | undefined {
  return ["light", "dark"].find((c) => document.documentElement.classList.contains(c));
}

beforeEach(() => {
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
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.removeAttribute("data-density");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("theme follows the system preference when the operator has not chosen", () => {
  it("resolves to dark on a dark-preferring machine", () => {
    mockSystemTheme(true);
    mount();

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(htmlThemeClass()).toBe("dark");
  });

  it("resolves to light on a light-preferring machine — the case the old config made impossible", () => {
    mockSystemTheme(false);
    mount();

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(htmlThemeClass()).toBe("light");
  });

  it("writes nothing to storage until the operator actually chooses", () => {
    mockSystemTheme(true);
    mount();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("an explicit choice outranks the system preference", () => {
  it("wins immediately", () => {
    mockSystemTheme(true);
    mount();

    choose("light");

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(htmlThemeClass()).toBe("light");
    expect(localStorage.getItem(KEY)).toBe("light");
  });

  it("survives a reload, with the system still saying the opposite", () => {
    mockSystemTheme(true);
    mount();
    choose("light");

    // Reload: tear the tree down and rebuild it from scratch, leaving
    // only what actually persists (localStorage).
    cleanup();
    document.documentElement.classList.remove("light", "dark");
    mockSystemTheme(true);
    mount();

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(htmlThemeClass()).toBe("light");
  });

  it("can be handed back to the system", () => {
    mockSystemTheme(true);
    mount();
    choose("light");
    choose("system");

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });
});

describe("the pre-paint script agrees with next-themes", () => {
  it("applies the system preference before React exists when nothing is stored", () => {
    mockSystemTheme(true);
    new Function(preferencesScriptSource(SCOPE))();

    expect(htmlThemeClass()).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("applies a stored explicit choice over the system preference", () => {
    mockSystemTheme(true);
    localStorage.setItem(KEY, "light");
    new Function(preferencesScriptSource(SCOPE))();

    expect(htmlThemeClass()).toBe("light");
  });

  it('treats a stored "system" as no choice at all', () => {
    mockSystemTheme(false);
    localStorage.setItem(KEY, "system");
    new Function(preferencesScriptSource(SCOPE))();

    expect(htmlThemeClass()).toBe("light");
  });

  it("agrees with what next-themes then hydrates to, so there is no second switch", () => {
    mockSystemTheme(true);
    localStorage.setItem(KEY, "light");

    new Function(preferencesScriptSource(SCOPE))();
    const beforeReact = htmlThemeClass();

    mount();

    expect(beforeReact).toBe("light");
    expect(htmlThemeClass()).toBe(beforeReact);
  });

  it("does not read another tenant's stored theme", () => {
    mockSystemTheme(true);
    localStorage.setItem(themeStorageKey("globex"), "light");

    new Function(preferencesScriptSource(SCOPE))();

    expect(htmlThemeClass()).toBe("dark");
  });
});
