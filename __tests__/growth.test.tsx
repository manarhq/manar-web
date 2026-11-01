import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LaunchOfferNotice } from "@/components/manar/growth/launch-offer-notice";
import growthAr from "@/messages/ar/growth.json";
import growthEn from "@/messages/en/growth.json";

const useLaunchOffer = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-growth", () => ({ useLaunchOffer }));

function flat(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (value === null || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("growth messages", () => {
  const en = new Map(flat(growthEn));
  const ar = new Map(flat(growthAr));
  it("has the same keys and placeholders in English and Arabic, none empty", () => {
    expect([...ar.keys()].sort()).toEqual([...en.keys()].sort());
    const slots = (s: unknown) =>
      String(s)
        .match(/\{\w+\}/g)
        ?.sort()
        .join() ?? "";
    for (const [k, v] of en) {
      expect(slots(ar.get(k)), k).toBe(slots(v));
      expect(v, k).not.toBe("");
    }
  });
});

describe("LaunchOfferNotice", () => {
  afterEach(cleanup);
  const show = (locale: "en" | "ar", data: unknown) => {
    useLaunchOffer.mockReturnValue({ data });
    return render(
      <NextIntlClientProvider
        locale={locale}
        messages={{ growth: locale === "en" ? growthEn : growthAr }}
      >
        <LaunchOfferNotice />
      </NextIntlClientProvider>,
    );
  };

  it("shows how many are left", () => {
    show("en", { enabled: true, total: 100, claimed: 63, remaining: 37 });
    expect(screen.getByRole("status")).toHaveTextContent("37 of 100 left");
  });
  it("shows the Arabic text", () => {
    show("ar", { enabled: true, total: 100, claimed: 63, remaining: 37 });
    expect(screen.getByRole("status")).toHaveTextContent("متبقٍ 37 من 100");
  });
  it("says it ended at 100, and hides when the offer never ran", () => {
    show("en", { enabled: false, total: 100, claimed: 100, remaining: 0 });
    expect(screen.getByRole("status")).toHaveTextContent(growthEn.offer.ended);
    cleanup();
    const { container } = show("en", { enabled: false, total: 100, claimed: 0, remaining: 0 });
    expect(container).toBeEmptyDOMElement();
  });
});
