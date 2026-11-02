import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewDashboard } from "@/components/manar/overview/overview-dashboard";
import auditAr from "@/messages/ar/audit.json";
import auditEn from "@/messages/en/audit.json";
import commonEn from "@/messages/en/common.json";
import overviewEn from "@/messages/en/overview.json";
import riskEn from "@/messages/en/risk.json";

/**
 * A mutating tool call whose answer was lost is recorded as UNKNOWN
 * (`tool.invocation.outcome_unknown`). The console must say "outcome
 * unknown, needs reconciliation", never let it read as done or failed.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const auditSearch = vi.hoisted(() => vi.fn());
const ok = (data: unknown) => ({ isPending: false, isError: false, error: null, data });
vi.mock("@/hooks/use-audit", () => ({ useAuditSearch: auditSearch }));
vi.mock("@/hooks/use-approvals", () => ({
  useApprovalsList: () => ok({ pages: [{ items: [] }] }),
}));
vi.mock("@/hooks/use-agents", () => ({ useAgentsList: () => ok({ pages: [{ items: [] }] }) }));
vi.mock("@/hooks/use-audit-verify", () => ({ useAuditVerify: () => ok({ valid: true }) }));
vi.mock("@/hooks/use-live-event-count", () => ({
  useLiveEventCount: () => ({ count: 0, status: "open" }),
}));
// The protection card has its own test (protection-card.test.tsx).
vi.mock("@/components/manar/personal/protection-card", () => ({ ProtectionCard: () => null }));
vi.mock("@/hooks/use-actor-name", () => ({ useActorNameResolver: () => () => "agent" }));

function event(eventId: string, eventType: string, status?: string) {
  return {
    eventId,
    eventType,
    timestamp: "2026-09-25T10:00:00.000Z",
    actor: { type: "agent", id: "a1" },
    data: status ? { status } : {},
  };
}

function renderOverview(events: unknown[], locale: "en" | "ar" = "en") {
  auditSearch.mockReturnValue(ok({ pages: [{ items: events }] }));
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{
        common: commonEn,
        overview: overviewEn,
        risk: riskEn,
        audit: locale === "ar" ? auditAr : auditEn,
      }}
    >
      <OverviewDashboard />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  auditSearch.mockReset();
});

describe("UNKNOWN tool-invocation outcome", () => {
  it("is flagged as needing reconciliation in the activity list", () => {
    renderOverview([event("e1", "tool.invocation.outcome_unknown", "UNKNOWN")]);

    expect(screen.getByText(auditEn.outcomeUnknown.label)).toBeDefined();
  });

  it("is flagged when only the recorded status says UNKNOWN", () => {
    renderOverview([event("e1", "tool.invocation.completed", "UNKNOWN")]);

    expect(screen.getByText(auditEn.outcomeUnknown.label)).toBeDefined();
  });

  it("is not shown for a completed or a failed invocation", () => {
    renderOverview([
      event("e1", "tool.invocation.completed", "SUCCESS"),
      event("e2", "tool.invocation.failed", "FAILURE"),
    ]);

    expect(screen.queryByText(auditEn.outcomeUnknown.label)).toBeNull();
  });

  it("is translated in Arabic", () => {
    renderOverview([event("e1", "tool.invocation.outcome_unknown", "UNKNOWN")], "ar");

    expect(screen.getByText(auditAr.outcomeUnknown.label)).toBeDefined();
    expect(screen.queryByText(auditEn.outcomeUnknown.label)).toBeNull();
  });
});
