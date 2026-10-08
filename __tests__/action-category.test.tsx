import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ActionCategoryBadge, actionCategory } from "@/components/manar/action-category-badge";
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
