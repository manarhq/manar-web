import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChainVerifyButton } from "@/components/manar/audit/chain-verify-button";
import { OverviewDashboard } from "@/components/manar/overview/overview-dashboard";
import {
  auditBadgeState,
  coveredFrom,
  fullCheck,
  lastFullVerifiedAt,
  type AuditVerifyResult,
} from "@/lib/audit-verify";
import auditEn from "@/messages/en/audit.json";
import commonEn from "@/messages/en/common.json";
import overviewEn from "@/messages/en/overview.json";
import riskEn from "@/messages/en/risk.json";

const verify = vi.hoisted(() => ({ data: undefined as unknown }));
const empty = { isPending: false, isError: false, data: { pages: [{ items: [] }] } };

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/use-audit-verify", () => ({
  useAuditVerify: () => ({ isPending: false, isError: false, data: verify.data }),
}));
vi.mock("@/hooks/use-audit", () => ({
  useAuditSearch: () => empty,
  useAuditVerifyChain: () => ({
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    data: verify.data,
  }),
}));
vi.mock("@/hooks/use-approvals", () => ({ useApprovalsList: () => empty }));
vi.mock("@/hooks/use-incidents", () => ({ useIncidentsList: () => empty }));
vi.mock("@/hooks/use-agents", () => ({ useAgentsList: () => empty }));
vi.mock("@/hooks/use-live-event-count", () => ({
  useLiveEventCount: () => ({ count: 0, status: "open" }),
}));
vi.mock("@/hooks/use-actor-name", () => ({ useActorNameResolver: () => () => "someone" }));

const base = { eventCount: 3, brokenAt: null, verifiedAt: "2026-11-05T01:00:00.000Z" };
const FULL = "2026-11-05T00:30:00.000Z";
const SINCE = "2026-11-04T00:00:00.000Z";

const CASES: {
  name: string;
  data: AuditVerifyResult;
  state: "verified" | "recent-only" | "broken";
}[] = [
  {
    name: "valid + passed",
    data: { ...base, valid: true, fullCheck: "passed", lastFullVerifiedAt: FULL },
    state: "verified",
  },
  {
    name: "valid, full check never ran",
    data: {
      ...base,
      valid: true,
      fullCheck: "never",
      lastFullVerifiedAt: null,
      coveredFrom: SINCE,
    },
    state: "recent-only",
  },
  {
    name: "not valid, full check stale",
    data: {
      ...base,
      valid: false,
      fullCheck: "stale",
      lastFullVerifiedAt: FULL,
      coveredFrom: SINCE,
    },
    state: "recent-only",
  },
  { name: "older API without the fields", data: { ...base, valid: true }, state: "recent-only" },
  {
    name: "full check failed",
    data: { ...base, valid: false, fullCheck: "failed", lastFullVerifiedAt: null },
    state: "broken",
  },
  {
    name: "full check errored",
    data: { ...base, valid: false, fullCheck: "error" },
    state: "broken",
  },
  {
    name: "valid but a broken event is named",
    data: { ...base, valid: true, fullCheck: "passed", brokenAt: "evt-1" },
    state: "broken",
  },
];

function withIntl(node: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={{ common: commonEn, overview: overviewEn, risk: riskEn, audit: auditEn }}
    >
      {node}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe("audit badge helpers", () => {
  it("reads the new fields defensively", () => {
    expect(lastFullVerifiedAt(undefined)).toBeNull();
    expect(lastFullVerifiedAt({ ...base, valid: true, lastFullVerifiedAt: "soon" })).toBeNull();
    expect(coveredFrom({ ...base, valid: true, coveredFrom: SINCE })).toBe(SINCE);
    expect(fullCheck({ ...base, valid: true })).toBe("never");
    expect(auditBadgeState(undefined)).toBe("broken");
  });
});

describe.each(CASES)("$name", ({ data, state }) => {
  it("overview tile claims only what the data supports", () => {
    verify.data = data;
    render(withIntl(<OverviewDashboard />));
    const tile = screen.getByTestId("stat-tile-audit-verify");
    if (state === "verified") expect(tile).toHaveTextContent(/Verified(?! since)/);
    else expect(tile).not.toHaveTextContent(/Verified(?! since)/);
    if (state === "recent-only") expect(tile).toHaveTextContent(overviewEn.auditRecentOnly);
    if (state === "broken") expect(tile).toHaveTextContent(overviewEn.auditBroken);
    if (data.lastFullVerifiedAt && state !== "broken")
      expect(tile).toHaveTextContent("Last full check");
    if (!data.lastFullVerifiedAt) expect(tile).toHaveTextContent(overviewEn.auditNotFullyVerified);
    if (data.coveredFrom) expect(tile).toHaveTextContent("Verified since");
  });

  it("the Verify chain button agrees", () => {
    verify.data = data;
    const { container } = render(withIntl(<ChainVerifyButton />));
    const text = container.textContent ?? "";
    if (state === "verified") expect(text).toContain(auditEn.verify.valid);
    else expect(text).not.toContain(auditEn.verify.valid);
    if (state === "recent-only") expect(text).toContain(auditEn.verify.recentOnly);
    if (state === "broken") expect(text).toContain(auditEn.verify.broken);
  });
});
