import type { ReactNode } from "react";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewDashboard } from "@/components/manar/overview/overview-dashboard";
import { ToolDetailView } from "@/components/manar/tools/tool-detail-view";
import { useAttentionCounts } from "@/hooks/use-attention-counts";
import commonEn from "@/messages/en/common.json";
import overviewEn from "@/messages/en/overview.json";
import riskEn from "@/messages/en/risk.json";
import toolsEn from "@/messages/en/tools.json";

/**
 * GATE-0 S50 / S51: "silence as health". When manar-api fails, the
 * console must say so (with the reason code), never show zero agents, no
 * pending approvals, no activity, or "this record does not exist".
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useRouter: () => ({ push: vi.fn() }),
}));

const hooks = vi.hoisted(() => ({
  approvals: vi.fn(),
  incidents: vi.fn(),
  agents: vi.fn(),
  audit: vi.fn(),
  tool: vi.fn(),
}));
vi.mock("@/hooks/use-approvals", () => ({ useApprovalsList: hooks.approvals }));
vi.mock("@/hooks/use-incidents", () => ({ useIncidentsList: hooks.incidents }));
vi.mock("@/hooks/use-agents", () => ({ useAgentsList: hooks.agents }));
vi.mock("@/hooks/use-audit", () => ({ useAuditSearch: hooks.audit }));
vi.mock("@/hooks/use-tools", () => ({ useToolDetail: hooks.tool }));
vi.mock("@/hooks/use-audit-verify", () => ({
  useAuditVerify: () => ({ isPending: false, isError: false, data: { valid: true } }),
}));
vi.mock("@/hooks/use-live-event-count", () => ({
  useLiveEventCount: () => ({ count: 0, status: "error" }),
}));
// The protection card has its own test (protection-card.test.tsx).
vi.mock("@/components/manar/personal/protection-card", () => ({ ProtectionCard: () => null }));
vi.mock("@/hooks/use-actor-name", () => ({ useActorNameResolver: () => () => "someone" }));

const DEPENDENCY_DOWN = {
  statusCode: 503,
  error: "Service Unavailable",
  reason: "enforcement_dependency_unavailable",
};

function failed(error: unknown) {
  return { isPending: false, isError: true, error, data: undefined, refetch: vi.fn() };
}

function withIntl(node: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={{ common: commonEn, overview: overviewEn, risk: riskEn, tools: toolsEn }}
    >
      {node}
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  Object.values(hooks).forEach((hook) => hook.mockReset());
});

describe("overview when the API is failing", () => {
  it("says monitoring is unavailable, with the reason, instead of zeros and empty states", () => {
    hooks.approvals.mockReturnValue(failed(DEPENDENCY_DOWN));
    hooks.agents.mockReturnValue(failed(DEPENDENCY_DOWN));
    hooks.audit.mockReturnValue(failed(new TypeError("Failed to fetch")));

    render(withIntl(<OverviewDashboard />));

    const alerts = screen.getAllByTestId("api-error-state");
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/enforcement_dependency_unavailable/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(commonEn.apiError.noResponse).length).toBeGreaterThan(0);

    // What it must not claim.
    expect(screen.queryByText(overviewEn.dashboard.agentStatus.ACTIVE)).toBeNull();
    expect(screen.queryByText(overviewEn.dashboard.recentActivityEmpty)).toBeNull();
    expect(screen.queryByText(overviewEn.dashboard.riskEmpty)).toBeNull();
  });
});

describe("sidebar attention counts when the API is failing", () => {
  it("marks the count unavailable rather than zero", () => {
    hooks.approvals.mockReturnValue(failed(DEPENDENCY_DOWN));
    hooks.incidents.mockReturnValue({ isError: false, data: { pages: [{ items: [] }] } });

    const { result } = renderHook(() => useAttentionCounts());

    expect(result.current.pendingApprovals.unavailable).toBe(true);
    expect(result.current.openIncidents.unavailable).toBe(false);
  });
});

describe("detail view failures", () => {
  it.each([
    ["a 503 with a reason", DEPENDENCY_DOWN, "Monitoring unavailable"],
    ["a network failure", new TypeError("Failed to fetch"), "Monitoring unavailable"],
    [
      "an expired session",
      { error: "unauthenticated", message: "No active session." },
      "Session expired",
    ],
    ["a 403", { statusCode: 403, message: "Forbidden" }, "Access denied"],
  ])("renders %s as an error, not as not-found", (_label, error, title) => {
    hooks.tool.mockReturnValue(failed(error));
    render(withIntl(<ToolDetailView toolId="tool-1" />));

    expect(screen.getByText(title)).toBeDefined();
    expect(screen.queryByText(commonEn.notFound.title)).toBeNull();
    expect(screen.queryByText(toolsEn.detail.notFoundBody)).toBeNull();
  });

  it("keeps a real 404 as not-found", () => {
    hooks.tool.mockReturnValue(failed({ statusCode: 404, message: "Not Found" }));
    render(withIntl(<ToolDetailView toolId="tool-1" />));

    expect(screen.getByText(toolsEn.detail.notFoundBody)).toBeDefined();
    expect(screen.queryByTestId("api-error-state")).toBeNull();
  });
});
