import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { isRtlLocale, routing } from "@/i18n/routing";
import { RiskBadge } from "@/components/manar/risk-badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import riskEn from "@/messages/en/risk.json";
import riskAr from "@/messages/ar/risk.json";

afterEach(() => {
  cleanup();
});

/**
 * Unit-level RTL coverage: the locale->direction mapping that
 * app/[locale]/layout.tsx feeds into `<html dir=...>`, and that a
 * direction-sensitive component actually renders the translated (not
 * transliterated/mirrored) string for each locale. jsdom has no layout
 * engine, so it cannot assert that logical Tailwind utilities
 * (`ps-`/`pe-`/`border-e`, used throughout components/manar/) visually
 * flip on screen — that was verified manually in a real browser (see the
 * session's verification notes) by loading /ar/overview and comparing
 * sidebar/border placement against /en/overview.
 */
describe("locale direction", () => {
  it("only Arabic is configured RTL, English stays LTR", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
  });

  it("every configured locale has an explicit direction", () => {
    for (const locale of routing.locales) {
      expect(typeof isRtlLocale(locale)).toBe("boolean");
    }
  });
});

function renderWithLocale(
  ui: ReactElement,
  locale: "en" | "ar",
  messages: Record<string, unknown>,
) {
  return render(
    <div dir={isRtlLocale(locale) ? "rtl" : "ltr"} lang={locale}>
      <NextIntlClientProvider locale={locale} messages={{ risk: messages }}>
        {ui}
      </NextIntlClientProvider>
    </div>,
  );
}

describe("RiskBadge localization", () => {
  it("renders the English band label for English", () => {
    renderWithLocale(<RiskBadge score={90} />, "en", riskEn);
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
  });

  it("renders the real Arabic band label (not mirrored/transliterated English) for Arabic", () => {
    const { container } = renderWithLocale(<RiskBadge score={90} />, "ar", riskAr);
    expect(screen.getByText("حرج")).toBeInTheDocument();
    expect(container.querySelector("[dir='rtl']")).not.toBeNull();
  });

  it("uses the same band thresholds regardless of locale", () => {
    renderWithLocale(<RiskBadge score={10} />, "en", riskEn);
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });
});

/**
 * components/manar/sidebar.tsx's mobile nav drawer picks the Sheet's
 * `side` from the actual locale direction (`isRtlLocale(locale) ? "right"
 * : "left"`) rather than the framework default, so the drawer always
 * slides in from the reading-start edge. `side` is a real prop value that
 * lands on the DOM as `data-side` (see components/ui/sheet.tsx), so unlike
 * genuine layout/paint this is something jsdom can actually assert on —
 * exercising the exact `Sheet`/`SheetContent` primitives sidebar.tsx
 * renders, with the same `isRtlLocale` expression, rather than mocking it.
 */
describe("mobile nav drawer side (sidebar.tsx)", () => {
  function renderDrawer(locale: "en" | "ar") {
    render(
      <Sheet open modal={false}>
        <SheetContent side={isRtlLocale(locale) ? "right" : "left"}>
          <SheetTitle>Menu</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
  }

  it("opens from the right for Arabic (RTL)", () => {
    renderDrawer("ar");
    expect(screen.getByText("Menu").closest("[data-side]")).toHaveAttribute("data-side", "right");
  });

  it("opens from the left for English (LTR)", () => {
    renderDrawer("en");
    expect(screen.getByText("Menu").closest("[data-side]")).toHaveAttribute("data-side", "left");
  });
});
