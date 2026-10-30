import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import enPlanLimit from "@/messages/en/planLimit.json";
import arPlanLimit from "@/messages/ar/planLimit.json";
import enBilling from "@/messages/en/billing.json";
import arBilling from "@/messages/ar/billing.json";
import { isPlanLimitPayload, PlanLimitNotice } from "@/components/manar/plan-limit-notice";

const payload = {
  code: "plan_limit_reached",
  limit: "devices" as const,
  current: 3,
  max: 3,
  upgradeUrl: "https://c.example/settings/billing",
};

function show(locale: "en" | "ar") {
  const planLimit = locale === "en" ? enPlanLimit : arPlanLimit;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ planLimit }}>
      <PlanLimitNotice error={payload} />
    </NextIntlClientProvider>,
  );
}

describe("PlanLimitNotice", () => {
  it("names the limit and links to Upgrade (EN)", () => {
    show("en");
    expect(screen.getByRole("alert").textContent).toContain("allows 3 devices, and you have 3");
    expect(screen.getByRole("link", { name: "Upgrade" }).getAttribute("href")).toBe(
      payload.upgradeUrl,
    );
  });
  it("renders in Arabic", () => {
    show("ar");
    expect(screen.getByRole("link", { name: "ترقية" })).toBeTruthy();
  });
  it("recognises the API payloads", () => {
    expect(isPlanLimitPayload(payload)).toBe(true);
    expect(isPlanLimitPayload({ code: "workspace_read_only" })).toBe(true);
    expect(isPlanLimitPayload({ statusCode: 403 })).toBe(false);
  });
  it("billing messages have the same keys in EN and AR", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" ? keys(v as object, `${p}${k}.`) : [`${p}${k}`],
      );
    expect(keys(arBilling).sort()).toEqual(keys(enBilling).sort());
    expect(keys(arPlanLimit).sort()).toEqual(keys(enPlanLimit).sort());
  });
});
