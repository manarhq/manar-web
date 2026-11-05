import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppealForm } from "@/components/manar/suspended/appeal-form";
import { isAccountSuspended } from "@/lib/api/errors";
import auditAr from "@/messages/ar/audit.json";
import auditEn from "@/messages/en/audit.json";
import suspendedAr from "@/messages/ar/suspended.json";
import suspendedEn from "@/messages/en/suspended.json";

/** DESK spec 9.2, 9.4 and 11.5 on the customer side: the suspended page, the appeal and the trust log. */

vi.mock("@/hooks/use-users", () => ({ useUsersList: () => ({ data: undefined }) }));
vi.mock("@/hooks/use-agents", () => ({ useAgentsList: () => ({ data: undefined }) }));
const { useActorNameResolver, isStaffActor } = await import("@/hooks/use-actor-name");

const CATEGORIES = [
  "terms_violation",
  "abuse_or_attack",
  "fraud_or_payment",
  "spam_or_bulk_signups",
  "security_risk",
  "legal_request",
  "ban_evasion",
  "other_policy",
] as const;

afterEach(() => {
  cleanup();
  delete window.turnstile;
});

const form = (siteKey = "site-key") =>
  render(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ suspended: suspendedEn }}>
      <AppealForm
        siteKey={siteKey}
        appeal={null}
        availableAt={new Date(Date.now() - 1000).toISOString()}
        nextAt="now"
      />
    </NextIntlClientProvider>,
  );

describe("appeal form", () => {
  it("keeps Send disabled until Turnstile gives a token, even with text", () => {
    let pass: (t: string) => void = () => {};
    window.turnstile = {
      render: (_el, opts) => {
        pass = opts.callback as (t: string) => void;
        return "w1";
      },
      remove: () => {},
    };
    form();
    fireEvent.change(screen.getByTestId("appeal-text"), {
      target: { value: "I run a small agency." },
    });
    expect(screen.getByTestId("appeal-submit")).toBeDisabled();
    act(() => pass("token-1"));
    expect(screen.getByTestId("appeal-submit")).toBeEnabled();
    act(() => (window.turnstile as unknown as { _ok?: boolean }) && pass(""));
    expect(screen.getByTestId("appeal-submit")).toBeDisabled();
  });

  it("says so, and never enables Send, when no site key is configured", () => {
    form("");
    fireEvent.change(screen.getByTestId("appeal-text"), { target: { value: "Text" } });
    expect(screen.getByTestId("appeal-submit")).toBeDisabled();
    expect(screen.getByText(suspendedEn.appeal.noCheck)).toBeTruthy();
  });

  it("shows the received state instead of the form while an appeal is open", () => {
    render(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ suspended: suspendedEn }}>
        <AppealForm
          siteKey="k"
          appeal={{ code: "APL-ABCD12", status: "OPEN", dueAt: "Thu" }}
          availableAt={new Date().toISOString()}
          nextAt="x"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId("appeal-received").textContent).toContain("We got your appeal");
    expect(screen.queryByTestId("appeal-submit")).toBeNull();
  });
});

describe("restriction categories", () => {
  it("has a title and a plain explanation for all eight, in English and Arabic", () => {
    for (const m of [suspendedEn, suspendedAr])
      for (const c of CATEGORIES) {
        expect(m.category[c].title.length).toBeGreaterThan(3);
        expect(m.category[c].body.length).toBeGreaterThan(10);
      }
    expect(Object.keys(suspendedAr.category).sort()).toEqual([...CATEGORIES].sort());
  });
});

describe("account_suspended detection", () => {
  it("is a 403 with that code only", () => {
    expect(isAccountSuspended(403, { code: "account_suspended", kind: "SUSPEND" })).toBe(true);
    expect(isAccountSuspended(403, { code: "forbidden" })).toBe(false);
    expect(isAccountSuspended(401, { code: "account_suspended" })).toBe(false);
    expect(isAccountSuspended(403, null)).toBe(false);
  });
});

describe("staff entries in the audit log", () => {
  const resolve = () =>
    renderHook(() => useActorNameResolver(), {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="en" messages={{ audit: auditEn }}>
          {children}
        </NextIntlClientProvider>
      ),
    }).result.current;

  it("shows the badge text, never the staff id", () => {
    const actor = {
      type: "staff",
      id: "6f1c0000-0000-4000-8000-000000000001",
      display: "Ali · Manar Sales",
    };
    expect(isStaffActor(actor)).toBe(true);
    expect(resolve()(actor)).toBe("Ali · Manar Sales");
    expect(resolve()({ type: "staff", id: "x" })).toBe("Manar team");
  });

  it("labels every staff event type with a plain sentence in both languages", () => {
    for (const k of [
      "staff_record_viewed",
      "staff_pii_viewed",
      "staff_action",
      "staff_restriction",
    ]) {
      expect((auditEn.eventLabels as Record<string, string>)[k]).toMatch(/Manar/);
      expect((auditAr.eventLabels as Record<string, string>)[k]).toMatch(/منار/);
    }
  });
});
