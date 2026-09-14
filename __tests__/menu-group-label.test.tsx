import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Regression test for a crash found while building the topbar preference
 * menus: Base UI's `Menu.GroupLabel` (what `DropdownMenuLabel` renders)
 * reads a group context and THROWS "MenuGroupContext is missing" when it
 * is a bare child of the popup — in production builds too, not just
 * development. components/manar/topbar.tsx's user menu had exactly that
 * shape, so opening it crashed the console; it now wraps the label in a
 * `DropdownMenuGroup`, as do both preference menus.
 *
 * This asserts the shape rather than the specific component, so any menu
 * added later is covered by the same rule.
 */

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DropdownMenuLabel", () => {
  it("opens without throwing when wrapped in a group", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Signed in as analyst@example.test</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("open"));

    expect(await screen.findByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as analyst@example.test")).toBeInTheDocument();
  });
});
