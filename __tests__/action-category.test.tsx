import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ActionCategoryBadge, actionCategory } from "@/components/manar/action-category-badge";
import { buildToolActionLookup } from "@/hooks/use-tools";
import commonEn from "@/messages/en/common.json";
import commonAr from "@/messages/ar/common.json";

afterEach(cleanup);

describe("action category is derived only from the API's flags", () => {
  it("maps mutating/destructive to read, change and destructive", () => {
    expect(actionCategory({ mutating: false, destructive: false })).toBe("read");
    expect(actionCategory({ mutating: true, destructive: false })).toBe("change");
    expect(actionCategory({ mutating: true, destructive: true })).toBe("destructive");
    // Destructive wins even if the row is inconsistent.
    expect(actionCategory({ mutating: false, destructive: true })).toBe("destructive");
  });

  it("never reads a missing or malformed effect as a harmless read", () => {
    expect(actionCategory(null)).toBe("unknown");
    expect(actionCategory(undefined)).toBe("unknown");
    expect(actionCategory({})).toBe("unknown");
    expect(actionCategory({ mutating: "false", destructive: false })).toBe("unknown");
  });

  it("labels every category in EN and AR, with distinct Arabic text", () => {
    for (const category of ["read", "change", "destructive", "unknown"] as const) {
      expect(commonEn.actionCategory[category]).toBeTruthy();
      expect(commonAr.actionCategory[category]).toBeTruthy();
      expect(commonAr.actionCategory[category]).not.toBe(commonEn.actionCategory[category]);
    }
  });

  it("renders an unknown effect as Unknown, not Read", () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ common: commonEn }}>
        <ActionCategoryBadge category={actionCategory(null)} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Unknown")).toBeDefined();
    expect(screen.queryByText("Read")).toBeNull();
  });
});

describe("tool registry lookup never guesses", () => {
  const action = (id: string, name: string, destructive: boolean) =>
    ({ id, name, mutating: true, destructive }) as never;
  const tool = (id: string, name: string, actions: never[]) => ({ id, name, actions }) as never;

  it("resolves by ID or by name", () => {
    const lookup = buildToolActionLookup([
      tool("t-1", "graph", [action("a-1", "user.disable", true)]),
    ]);
    expect(lookup("t-1", "a-1")?.action.id).toBe("a-1");
    expect(lookup("graph", "user.disable")?.action.id).toBe("a-1");
  });

  it("does not match an ID against a name", () => {
    const lookup = buildToolActionLookup([
      tool("t-1", "graph", [action("a-1", "user.disable", true)]),
    ]);
    expect(lookup("t-1", "user.disable")).toBeUndefined();
    expect(lookup("graph", "a-1")).toBeUndefined();
  });

  it("treats two actions under one name as unknown, not whichever came last", () => {
    const lookup = buildToolActionLookup([
      tool("t-1", "graph", [action("a-1", "user.disable", true)]),
      tool("t-2", "graph", [action("a-2", "user.disable", false)]),
    ]);
    expect(lookup("graph", "user.disable")).toBeUndefined();
    expect(actionCategory(lookup("graph", "user.disable")?.action)).toBe("unknown");
  });

  it("treats an ID match and a different name match as unknown", () => {
    // Tool B's *names* equal tool A's *IDs*.
    const lookup = buildToolActionLookup([
      tool("x", "a", [action("y", "b", true)]),
      tool("t-2", "x", [action("a-2", "y", false)]),
    ]);
    expect(lookup("x", "y")).toBeUndefined();
  });
});
