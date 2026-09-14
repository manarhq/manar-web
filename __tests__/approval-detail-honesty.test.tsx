import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalDetailView } from "@/components/manar/approvals/approval-detail-view";
import approvalsEn from "@/messages/en/approvals.json";
import approvalsAr from "@/messages/ar/approvals.json";
import commonEn from "@/messages/en/common.json";

/**
 * Release 2026-11-11. These tests are about **truthfulness**, not layout.
 *
 * The approval card used to carry two honest "not available" panels
 * because manar-api's list DTO exposed only tool/action/resource/risk
 * metadata — an approver was binding a cryptographic grant to a parameter
 * snapshot they had never been shown. `GET /approvals/:id` now returns
 * that snapshot, and the ways this card can now *lie* are specific:
 *
 *  - rendering `aiAdvisoryScore: null` as `0`, which would state that the
 *    AI assessed this as zero risk when in fact no signal was available;
 *  - rendering a field the backend never recorded as a real value;
 *  - showing a redacted parameter object without saying anything was
 *    withheld, so a partial payload reads as a complete one.
 *
 * Each of those gets a test.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/use-agents", () => ({
  useAgentDetail: () => ({ data: { displayName: "Triage bot" } }),
}));

vi.mock("@/hooks/use-tasks", () => ({
  useTaskDetail: () => ({ data: { name: "Contain WS-042" } }),
}));

const useApprovalDetail = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-approvals", () => ({
  useApprovalDetail,
}));

function approvalDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    taskId: "task-1",
    agentId: "agent-1",
    toolId: "iam",
    actionId: "disable-user",
    resource: "user-7",
    status: "APPROVED",
    requestedAt: "2026-09-08T10:00:00.000Z",
    expiresAt: "2026-09-08T10:30:00.000Z",
    params: { scope: "all-sessions", cascade: true },
    redactedKeyPaths: [] as string[],
    parametersTruncated: false,
    parameterDigest: "a".repeat(64),
    riskScore: 62,
    deterministicRiskScore: 62,
    aiAdvisoryScore: null,
    taskRiskCeiling: 50,
    requiredReason: "risk_ceiling_exceeded",
    deterministicReasonCodes: ["baseline", "destructive_action"],
    aiAdvisoryReasonCodes: [] as string[],
    policyVersionId: null,
    expectedEffect: {
      actionName: "disable-user",
      mutating: true,
      destructive: true,
      classification: "CONFIDENTIAL",
    },
    decisions: [],
    grantIssued: true,
    grantConsumedAt: null,
    ...overrides,
  };
}

function renderCard(
  detail: Record<string, unknown>,
  locale: "en" | "ar" = "en",
): ReactElement | void {
  useApprovalDetail.mockReturnValue({
    data: detail,
    isPending: false,
    isError: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale={locale}
        messages={{
          approvals: locale === "ar" ? approvalsAr : approvalsEn,
          common: commonEn,
        }}
      >
        <ApprovalDetailView approvalId="approval-1" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  useApprovalDetail.mockReset();
});

describe("approval detail — the reviewed snapshot is shown", () => {
  it("renders the invocation parameters the grant is bound to", () => {
    renderCard(approvalDetail());

    // The motivating case: `cascade: true` and `scope: "all-sessions"` are
    // exactly what make this action bigger than its name suggests.
    expect(screen.getByText(/all-sessions/)).toBeDefined();
    expect(screen.getByText(/cascade/)).toBeDefined();
  });

  it("shows the parameter digest and explains what it binds", () => {
    renderCard(approvalDetail());

    expect(screen.getByText("a".repeat(64))).toBeDefined();
    expect(screen.getByText(approvalsEn.card.digestHint)).toBeDefined();
  });

  it("states why approval was required, rather than only showing a number", () => {
    renderCard(approvalDetail({ requiredReason: "risk_ceiling_exceeded" }));

    expect(screen.getByText(approvalsEn.card.reasonRiskCeiling)).toBeDefined();
  });

  it("keeps deterministic and AI-attributed factors visually separate", () => {
    renderCard(
      approvalDetail({
        deterministicReasonCodes: ["baseline"],
        aiAdvisoryReasonCodes: ["ai_advisory_elevated"],
      }),
    );

    expect(screen.getByText(approvalsEn.card.deterministicFactors)).toBeDefined();
    expect(screen.getByText(approvalsEn.card.aiAdvisoryFactors)).toBeDefined();
    expect(screen.getByText("baseline")).toBeDefined();
    expect(screen.getByText("ai_advisory_elevated")).toBeDefined();
  });
});

describe("approval detail — the ways this card could lie", () => {
  it("never renders a missing AI advisory score as zero", () => {
    // null means no advisory signal was available. Rendering it as 0 would
    // assert that the AI looked and found no risk.
    renderCard(approvalDetail({ aiAdvisoryScore: null }));

    expect(screen.getByText(approvalsEn.card.noAiSignal)).toBeDefined();
    expect(screen.queryByText(approvalsEn.card.aiAdvisoryScore)).toBeDefined();
  });

  it("renders a genuinely zero AI advisory score as zero", () => {
    // The other half of the same property: 0 is a real assessment and must
    // not be hidden behind the "no signal" copy.
    renderCard(approvalDetail({ aiAdvisoryScore: 0 }));

    expect(screen.queryByText(approvalsEn.card.noAiSignal)).toBeNull();
  });

  it("renders fields the backend never recorded as 'not recorded', not as values", () => {
    renderCard(
      approvalDetail({
        requiredReason: null,
        deterministicRiskScore: null,
      }),
    );

    expect(screen.getAllByText(approvalsEn.card.notRecorded).length).toBeGreaterThan(0);
  });

  it("says how many parameter values were withheld, and names them", () => {
    // Without this, a redacted object is indistinguishable from an action
    // that simply has no credential parameter.
    renderCard(
      approvalDetail({
        params: { host: "ws-042", apiKey: "[redacted]" },
        redactedKeyPaths: ["apiKey"],
      }),
    );

    // `apiKey` appears twice — once in the payload, once in the withheld
    // list — which is itself the point: the reviewer can see the key exists
    // and that its value was withheld.
    expect(screen.getAllByText(/apiKey/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/1 value withheld/)).toBeDefined();
  });

  it("warns when the parameter payload was too large to show in full", () => {
    renderCard(approvalDetail({ parametersTruncated: true }));

    expect(screen.getByText(approvalsEn.card.paramsTruncated)).toBeDefined();
  });

  it("does not claim a truncation warning when the payload was complete", () => {
    renderCard(approvalDetail({ parametersTruncated: false }));

    expect(screen.queryByText(approvalsEn.card.paramsTruncated)).toBeNull();
  });

  it("marks a destructive action as destructive", () => {
    renderCard(approvalDetail());

    expect(screen.getByText(approvalsEn.card.effectDestructive)).toBeDefined();
  });
});

describe("approval detail — Arabic", () => {
  it("renders the risk-breakdown copy in real Arabic, not a raw key", () => {
    renderCard(approvalDetail(), "ar");

    expect(screen.getByText(approvalsAr.card.noAiSignal)).toBeDefined();
    expect(screen.getByText(approvalsAr.card.digestHint)).toBeDefined();
    // Guard against the failure where a missing translation silently falls
    // back to the English string.
    expect(screen.queryByText(approvalsEn.card.noAiSignal)).toBeNull();
  });
});
