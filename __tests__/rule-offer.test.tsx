import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AllowGrantsList } from "@/components/manar/features/allow-grants-list";
import { ApprovalsQueueView } from "@/components/manar/approvals/approvals-queue-view";
import { DECISION_KEYS_ARM_MS } from "@/hooks/use-decision-keys";
import { BffError } from "@/lib/api/raw";
import { hostApprovalAsQueueItem } from "@/hooks/use-pending-approvals-count";
import approvalsAr from "@/messages/ar/approvals.json";
import approvalsEn from "@/messages/en/approvals.json";
import commonEn from "@/messages/en/common.json";
import featuresAr from "@/messages/ar/features.json";
import featuresEn from "@/messages/en/features.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";
import riskEn from "@/messages/en/risk.json";

const answer = vi.hoisted(() => vi.fn());
const items = vi.hoisted(() => ({ current: [] as unknown[] }));
const grants = vi.hoisted(() => ({
  data: [] as unknown[],
  error: null as unknown,
  isError: false,
  isLoading: false,
  withdraw: vi.fn(),
}));
vi.mock("@/hooks/use-pending-approvals-count", async (orig) => ({
  ...(await orig<typeof import("@/hooks/use-pending-approvals-count")>()),
  usePendingApprovals: () => ({
    items: items.current,
    count: items.current.length,
    hasMore: false,
    isLoading: false,
    unavailable: false,
  }),
}));
vi.mock("@/hooks/use-approvals", () => ({ useApprovalDetail: () => ({ data: undefined }) }));
vi.mock("@/hooks/use-answer-approval", () => ({
  useAnswerApproval: () => ({
    answer: (...a: unknown[]) => {
      answer(...a);
      return Promise.resolve({ status: "sent" });
    },
    isPending: false,
  }),
}));
vi.mock("@/hooks/use-allow-grants", () => ({
  useAllowGrants: () => grants,
  useWithdrawGrant: () => ({ isPending: false, mutate: grants.withdraw }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

const base = {
  id: "a1",
  hostId: "h",
  toolId: "host.cursor",
  actionId: "edit",
  resource: "/home/sara/proj/src/a.ts",
  summary: "",
  highRisk: false,
  createdAt: "2026-10-31T10:00:00Z",
  expiresAt: "2026-10-31T10:10:00Z",
};
const offer = { scope: "/home/sara/proj/src/*", approvals: 3, lastsDays: 365 };

function provider(locale: string, node: React.ReactNode) {
  const ar = locale === "ar";
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={{
        approvals: ar ? approvalsAr : approvalsEn,
        personal: ar ? personalAr : personalEn,
        features: ar ? featuresAr : featuresEn,
        common: commonEn,
        risk: riskEn,
      }}
    >
      {node}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  answer.mockReset();
  grants.withdraw.mockReset();
  grants.data = [];
  grants.isError = false;
  grants.error = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("rule offer on the approval card (decision 37)", () => {
  it("shows what was offered, and one tap sends alwaysAllowHere", () => {
    items.current = [hostApprovalAsQueueItem({ ...base, ruleOffer: offer })];
    render(provider("en", <ApprovalsQueueView />));
    expect(screen.getByText(/approved this 3 times/)).toBeInTheDocument();
    expect(screen.getByText("/home/sara/proj/src/*")).toBeInTheDocument();
    // The duration comes from the payload, as a real end date.
    expect(screen.getByText(/Lasts until \w{3} \d{1,2}, \d{4}/)).toBeInTheDocument();
    expect(screen.queryByText(/Lasts a year/)).toBeNull();
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.click(screen.getByRole("button", { name: "Approve and always allow this here" }));
    expect(answer).toHaveBeenCalledWith("approve_once", { alwaysAllowHere: true });
  });

  it("is not shown without an offer, or to someone who may not give a standing answer", () => {
    items.current = [hostApprovalAsQueueItem(base)];
    const { unmount } = render(provider("en", <ApprovalsQueueView />));
    expect(screen.queryByRole("button", { name: "Approve and always allow this here" })).toBeNull();
    unmount();
    items.current = [
      hostApprovalAsQueueItem({
        ...base,
        ruleOffer: offer,
        allowedDecisions: ["approve_once", "deny"],
      }),
    ];
    render(provider("en", <ApprovalsQueueView />));
    expect(screen.queryByRole("button", { name: "Approve and always allow this here" })).toBeNull();
  });

  it("reads in Arabic, right to left", () => {
    items.current = [hostApprovalAsQueueItem({ ...base, ruleOffer: offer })];
    render(provider("ar", <ApprovalsQueueView />));
    expect(screen.getByRole("button", { name: "وافق واسمح دائماً هنا" })).toBeInTheDocument();
  });
});

describe("allowed without asking, on Rules", () => {
  const g = {
    id: "g1",
    origin: "offer",
    hostId: "h",
    hostName: "sara-laptop",
    toolId: "host.cursor",
    actionId: "edit",
    scope: "/home/sara/proj/src/*",
    createdAt: "2026-11-05T10:00:00Z",
    expiresAt: "2027-11-05T10:00:00Z",
    useCount: 2,
  };
  it("lists origin and the real end date, and each Withdraw names what it withdraws", () => {
    grants.data = [g, { ...g, id: "g2", origin: "learning", scope: "/home/sara/other/*" }];
    render(provider("en", <AllowGrantsList />));
    expect(screen.getByText("Always, offered after 3 approvals")).toBeInTheDocument();
    expect(screen.getByText("Always, from what Manar saw")).toBeInTheDocument();
    expect(screen.getAllByText("Until Nov 5, 2027")).toHaveLength(2);
    expect(screen.getAllByRole("time")[0]).toHaveAttribute("datetime", "2027-11-05T10:00:00Z");
    const first = screen.getByRole("button", {
      name: "Withdraw: Cursor edit in /home/sara/proj/src/*",
    });
    expect(
      screen.getByRole("button", { name: "Withdraw: Cursor edit in /home/sara/other/*" }),
    ).toBeInTheDocument();
    fireEvent.click(first);
    expect(grants.withdraw.mock.calls[0]![0]).toBe("g1");
  });
  it("announces the removal in a live region and moves focus to the heading", () => {
    grants.data = [g];
    grants.withdraw.mockImplementation((_id: string, o: { onSuccess: () => void }) =>
      o.onSuccess(),
    );
    render(provider("en", <AllowGrantsList />));
    fireEvent.click(screen.getByRole("button", { name: /^Withdraw: / }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Withdrawn: Cursor edit in /home/sara/proj/src/*. Manar will ask again.",
    );
    expect(screen.getByRole("heading", { name: "Allowed without asking" })).toHaveFocus();
  });
  it("says nothing yet when empty", () => {
    render(provider("en", <AllowGrantsList />));
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
  });
  it("only 403 and 404 hide the section; any other failure says so", () => {
    for (const status of [403, 404]) {
      cleanup();
      grants.isError = true;
      grants.error = new BffError(status, `HTTP ${status}`);
      expect(render(provider("en", <AllowGrantsList />)).container).toBeEmptyDOMElement();
    }
    for (const status of [500, 502, 0]) {
      cleanup();
      grants.isError = true;
      grants.error = status ? new BffError(status, `HTTP ${status}`) : new Error("network");
      render(provider("en", <AllowGrantsList />));
      expect(screen.getByRole("alert")).toHaveTextContent("Could not load this");
    }
  });
  it("has Arabic text", () => {
    grants.data = [g];
    render(provider("ar", <AllowGrantsList />));
    expect(screen.getByRole("button", { name: /^سحب: / })).toBeInTheDocument();
  });
});
