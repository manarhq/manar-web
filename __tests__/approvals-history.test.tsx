import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalsListView } from "@/components/manar/approvals/approvals-list-view";
import type { HistoryItem } from "@/hooks/use-approval-history";
import { BffError } from "@/lib/api/raw";
import { conflictKey } from "@/lib/approvals/conflict";
import { historyState } from "@/lib/approvals/history-state";
import { MIN_LIFE_MS, UNDO_MS, canHold, holdDecision, undoDecision } from "@/lib/approvals/hold";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import approvalsAr from "@/messages/ar/approvals.json";
import approvalsEn from "@/messages/en/approvals.json";
import commonEn from "@/messages/en/common.json";
import errorsEn from "@/messages/en/errors.json";

const page = vi.hoisted(() => ({ items: [] as unknown[], seesAll: true }));
const revoke = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-approval-history", () => ({
  useApprovalHistory: () => ({
    isPending: false,
    isError: false,
    data: { pages: [{ items: page.items, nextCursor: null, seesAll: page.seesAll }] },
    hasNextPage: false,
  }),
  useRevokeApproval: () => ({ mutate: revoke, isPending: false }),
  useEndStanding: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const base: HistoryItem = {
  kind: "host",
  id: "h1",
  requestedAt: "2026-11-02T10:00:00Z",
  status: "APPROVED",
  toolId: "host.claude-code",
  actionId: "site.connect",
  resource: "example.org",
  source: { type: "device", hostId: "x", name: "dev-laptop" },
  riskScore: null,
  decision: "approve_always",
  decidedByName: "Sara",
  decidedVia: "console",
  decidedAt: "2026-11-02T10:00:30Z",
  reason: null,
  endReason: null,
  expiresAt: "2026-11-02T10:02:00Z",
  usedAt: null,
  revokedAt: null,
  revokedByName: null,
  revokeNote: null,
  usedBeforeRevoke: null,
  standing: [],
  allowedDecisions: [],
  needs: null,
  why: null,
  canRevoke: true,
};

function ui(locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{
        approvals: locale === "en" ? approvalsEn : approvalsAr,
        common: commonEn,
        errors: errorsEn,
      }}
    >
      <ApprovalsListView />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("every state has its own words", () => {
  it.each([
    [{ status: "EXPIRED", endReason: "withdrawn" }, "noAnswerDevice"],
    [{ status: "EXPIRED", endReason: "paused" }, "withdrawnPaused"],
    [{ status: "DENIED", endReason: "task_not_live" }, "refusedByManar"],
    [{ status: "REVOKED", usedBeforeRevoke: true }, "revokedAfterUse"],
    [{ status: "REVOKED", usedBeforeRevoke: false }, "cancelledBeforeUse"],
    [{ status: "APPROVED", decision: "approve_8h" }, "approved8h"],
  ] as const)("%o reads as %s", (over, key) => {
    expect(historyState({ ...base, ...over } as HistoryItem).key).toBe(key);
  });
});

describe("history view", () => {
  it("shows device approvals with who, how and the state", () => {
    page.items = [base];
    ui();
    expect(screen.getByTestId("approval-history")).toHaveTextContent("Claude Code on dev-laptop");
    expect(screen.getByText("Always allowed")).toBeInTheDocument();
    expect(screen.getByText(/Sara · in the console/)).toBeInTheDocument();
  });

  it("Revoke says what will happen: cancel if unused, flag and block if used", () => {
    page.items = [base];
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Revoke…" }));
    expect(screen.getByText(/nothing will run/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel it now" }));
    expect(revoke).toHaveBeenCalledWith(
      { kind: "host", id: "h1", note: undefined },
      expect.anything(),
    );
    cleanup();
    page.items = [{ ...base, usedAt: "2026-11-02T10:00:40Z" }];
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Revoke…" }));
    expect(screen.getByText(/may have run/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke and block" })).toBeInTheDocument();
  });

  it("offers no Revoke to someone who may not", () => {
    page.items = [{ ...base, canRevoke: false }];
    ui();
    expect(screen.queryByRole("button", { name: "Revoke…" })).toBeNull();
  });

  it("marks a self-approval re-confirmed by sign-in", () => {
    page.items = [{ ...base, selfConfirmedAt: "2026-11-02T10:00:30Z" }];
    ui();
    expect(screen.getByText(/Self-approved, high risk, re-confirmed/)).toBeInTheDocument();
  });

  it("renders in Arabic", () => {
    page.items = [base];
    ui("ar");
    expect(screen.getByText("مسموح دائمًا")).toBeInTheDocument();
  });
});

describe("10-second Undo", () => {
  it("holds a decision, sends it after 10 s, and Undo drops it so nothing is sent", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    holdDecision("x1", send);
    vi.advanceTimersByTime(UNDO_MS - 1);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledOnce();

    const other = vi.fn();
    holdDecision("x2", other);
    expect(undoDecision("x2")).toBe(true);
    vi.advanceTimersByTime(UNDO_MS * 2);
    expect(other).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not hold a request about to expire: it is sent at once", () => {
    const now = Date.parse("2026-11-03T00:00:00Z");
    expect(canHold(new Date(now + MIN_LIFE_MS + 1000), now)).toBe(true);
    expect(canHold(new Date(now + MIN_LIFE_MS - 1000), now)).toBe(false);
  });
});

describe("409 reasons (E-021)", () => {
  it("a pause is a pause, not 'already decided'", () => {
    expect(conflictKey(new BffError(409, "x", { reason: "paused" }))).toBe("paused");
    expect(conflictKey(new BffError(409, "x", { reason: "expired" }))).toBe("expired");
    expect(conflictKey(new BffError(409, "x", {}))).toBe("failed");
    expect(conflictKey(new BffError(403, "x", { message: "no" }))).toBe("forbidden");
    expect(conflictKey(new BffError(401, "x", { code: "reauth_required" }))).toBe("reauth");
  });
});

describe("agent text is plain and cannot disguise itself", () => {
  it("replaces bidi and control characters and collapses padding", () => {
    const r = cleanAgentText("report-weekly‮fdp.exe");
    expect(r.flagged).toBe(true);
    expect(r.text).not.toContain("‮");
    expect(cleanAgentText("a" + " ".repeat(200) + "b").text).toBe("a b");
    expect(cleanAgentText("x".repeat(400), 300).truncated).toBe(true);
  });
});
