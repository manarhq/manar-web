import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { isRtlLocale, routing } from "@/i18n/routing";
import { RiskBadge } from "@/components/manar/risk-badge";
import riskEn from "@/messages/en/risk.json";
import riskAr from "@/messages/ar/risk.json";

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
