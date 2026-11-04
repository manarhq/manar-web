import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import enBilling from "@/messages/en/billing.json";
import arBilling from "@/messages/ar/billing.json";
import type { BillingStatus, UsageStatus } from "@/hooks/use-billing";

const hooks = vi.hoisted(() => ({
  billing: null as unknown,
  usage: null as unknown,
  params: new URLSearchParams(),
}));
const idle = vi.hoisted(() => () => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
}));
vi.mock("@/hooks/use-billing", () => ({
  useBilling: () => ({ isPending: false, isError: false, data: hooks.billing }),
  useUsage: () => ({ data: hooks.usage }),
  useBillingRedirect: idle,
  useBuyCredits: idle,
  useWalletSettings: idle,
  useCancelTrial: idle,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => hooks.params }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/telemetry/track", () => ({ track: vi.fn() }));

import { BillingView, UsageBanner } from "@/components/manar/billing/billing-view";

const billing = (o: Partial<BillingStatus> = {}): BillingStatus => ({
  plan: "pro",
  status: "active",
  limits: { devices: null, agents: null, cloudAgents: null, auditDays: 365 },
  features: ["tls_inspection"],
  allowance: { ai: 300, cloudMinutes: 300 },
  trialEndsAt: null,
  committedSeats: null,
  usage: { devices: 4, agents: 1, cloudAgents: 0 },
  interval: "month",
  workspaceKind: "PERSONAL",
  billingEnabled: true,
  hasSubscription: true,
  trialUsed: false,
  ...o,
});
const usage = (o: Partial<UsageStatus> = {}): UsageStatus => ({
  month: "2026-11",
  plan: "pro",
  allowance: { ai: { used: 120, included: 300 }, cloudMinutes: { used: 0, included: 300 } },
  wallet: {
    available: true,
    balance: 1000,
    expiringSoon: [],
    capCredits: 4000,
    creditsSpent: 0,
    autoTopUp: false,
    topUpsThisMonth: 0,
  },
  active: { kind: "device", count: 4, onTheirWay: 1 },
  bill: {
    currency: "usd",
    soFarCents: 900,
    forecastCents: 1100,
    extraUnitsSoFar: 2,
    extraUnitsForecast: 3,
    creditsForecast: 0,
  },
  alerts: [],
  ...o,
});

function show(locale: "en" | "ar", canEdit = true) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ billing: locale === "en" ? enBilling : arBilling }}
    >
      <BillingView canEdit={canEdit} />
    </NextIntlClientProvider>,
  );
}

describe("BillingView (pay-as-you-go)", () => {
  afterEach(() => {
    cleanup();
    hooks.params = new URLSearchParams();
  });

  it("shows usage, active devices, the bill so far and the forecast in USD with AED", () => {
    hooks.billing = billing();
    hooks.usage = usage();
    show("en");
    expect(screen.getByText("Usage and bill so far")).toBeTruthy();
    expect(screen.getByText("4 active, 1 on the way")).toBeTruthy();
    const body = document.body.textContent ?? "";
    expect(body).toContain("$9.00 (AED");
    expect(body).toContain("33.05");
    expect(body).toContain("1000 credits");
    expect(body).toContain("Safety is never metered");
  });

  it("a paused banner always says protection is still on, and never says protection stopped", () => {
    hooks.billing = billing();
    hooks.usage = usage({
      alerts: ["ai:50", "ai:80", "ai:100", "cap:50", "cap:80", "cap:100"],
    });
    render(
      <NextIntlClientProvider locale="en" messages={{ billing: enBilling }}>
        <UsageBanner usage={hooks.usage as UsageStatus} />
      </NextIntlClientProvider>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("spend cap");
    expect(alert.textContent).toContain("Protection is still on.");
    expect(document.body.textContent).not.toMatch(/protection (is )?(paused|off|stopped)/i);
    // A member without the billing role gets no data and no banner.
    cleanup();
    render(
      <NextIntlClientProvider locale="en" messages={{ billing: enBilling }}>
        <UsageBanner usage={undefined} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Free can buy credit packs; the Free banner explains the 20 included actions", () => {
    hooks.billing = billing({ plan: "free", hasSubscription: false, interval: null });
    hooks.usage = usage({
      plan: "free",
      allowance: { ai: { used: 20, included: 20 }, cloudMinutes: { used: 0, included: 0 } },
      wallet: { ...usage().wallet, balance: 0, capCredits: null },
      alerts: ["ai:50", "ai:80", "ai:100"],
    });
    show("en");
    expect(screen.getByRole("button", { name: /Buy 1000 credits/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pro, \$5 a month/ })).toBeTruthy();
  });

  it("a security admin sees the numbers but no buy, cap or auto top-up controls", () => {
    hooks.billing = billing();
    hooks.usage = usage();
    show("en", false);
    expect(screen.queryByRole("button", { name: /Buy/ })).toBeNull();
    expect(screen.queryByLabelText("Auto top-up")).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage billing" })).toBeNull();
  });

  it("a Company trial offers a one-click cancel", () => {
    hooks.billing = billing({
      plan: "company_trial",
      workspaceKind: "COMPANY",
      trialEndsAt: "2026-11-18T00:00:00.000Z",
    });
    hooks.usage = usage({ active: { kind: "seat", count: 2, onTheirWay: 0 } });
    hooks.params = new URLSearchParams("trial=cancel");
    show("en");
    expect(screen.getByRole("button", { name: "Cancel trial" })).toBeTruthy();
    expect(screen.getByText("Active seats")).toBeTruthy();
  });

  it("renders in Arabic", () => {
    hooks.billing = billing();
    hooks.usage = usage();
    show("ar");
    expect(screen.getByText("الاستخدام والفاتورة حتى الآن")).toBeTruthy();
    expect(screen.getByText("الأرصدة")).toBeTruthy();
  });
});
