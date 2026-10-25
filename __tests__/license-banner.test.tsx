import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LicenseBanner, bannerKind } from "@/components/manar/license-banner";
import type { TenantLicense } from "@/hooks/use-license";
import commonAr from "@/messages/ar/common.json";
import commonEn from "@/messages/en/common.json";

/**
 * The licence banner (manar-api docs/licensing.md). Licence limits are soft, so the banner must
 * never suggest that anything stopped, and it must not appear when there is nothing to say: a
 * valid licence, a hosted deployment without a licence, a non-admin, or no answer from the API.
 */

const useLicense = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-license", () => ({ useLicense }));

const lic = (over: Partial<TenantLicense>): TenantLicense => ({
  status: "valid",
  deployment: "customer",
  expiresAt: "2026-11-10T00:00:00.000Z",
  daysLeft: 16,
  overLimit: false,
  ...over,
});

function show(data: TenantLicense | undefined, isAdmin = true) {
  useLicense.mockReturnValue({ data });
  return render(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ common: commonEn }}>
      <LicenseBanner isAdmin={isAdmin} />
    </NextIntlClientProvider>,
  );
}

const l = commonEn.license;

describe("LicenseBanner", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("expiring: days left and date, and says Manar keeps working", () => {
    show(lic({ status: "expiring" }));
    expect(screen.getByRole("alert")).toHaveTextContent(l.expiring.title);
    expect(screen.getByRole("alert")).toHaveTextContent("It expires in 16 days, on Nov 10, 2026.");
    expect(screen.getByRole("alert")).toHaveTextContent(l.keepsWorking);
  });

  it.each([
    ["expired", l.expired.title],
    ["over_limit", l.over_limit.title],
    ["not_yet_valid", l.not_yet_valid.title],
    ["invalid_signature", l.invalid.title],
    ["unverifiable", l.unverifiable.title],
  ] as const)("%s shows its banner", (status, title) => {
    show(lic({ status }));
    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.getByRole("alert")).toHaveTextContent(l.keepsWorking);
  });

  it("missing: a banner in a customer deployment, none in a hosted one", () => {
    show(lic({ status: "missing", deployment: "customer", expiresAt: null, daysLeft: null }));
    expect(screen.getByRole("alert")).toHaveTextContent(l.missing.title);
    cleanup();
    show(lic({ status: "missing", deployment: "hosted", expiresAt: null, daysLeft: null }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hosted deployments still see a problem with an installed licence", () => {
    expect(bannerKind({ status: "expired", deployment: "hosted" })).toBe("expired");
  });

  it("nothing for a valid licence, before the API answers, or for a non-admin", () => {
    show(lic({ status: "valid" }));
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();
    show(undefined);
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();
    show(lic({ status: "expired" }), false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(useLicense).toHaveBeenCalledWith(false);
  });

  it("never says the product stopped: limits are soft", () => {
    const text = JSON.stringify(commonEn.license);
    expect(text).not.toMatch(/\b(blocked|disabled|suspended|stopped|locked)\b/i);
    expect(text).not.toMatch(/[–—]/);
    expect(JSON.stringify(commonAr.license)).not.toMatch(/[–—]/);
  });

  it("every English string has an Arabic one", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" ? keys(v as object, `${p}${k}.`) : [`${p}${k}`],
      );
    expect(keys(commonAr.license).sort()).toEqual(keys(commonEn.license).sort());
  });
});
