import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalsQueueView } from "@/components/manar/approvals/approvals-queue-view";
import { DECISION_KEYS_ARM_MS } from "@/hooks/use-decision-keys";
import { hostApprovalAsQueueItem } from "@/hooks/use-pending-approvals-count";
import { chimeEnabled, setChime } from "@/lib/push/chime";
import { urlBase64ToBytes } from "@/lib/push/subscribe";
import approvalsAr from "@/messages/ar/approvals.json";
import approvalsEn from "@/messages/en/approvals.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";
import commonEn from "@/messages/en/common.json";
import riskEn from "@/messages/en/risk.json";

const answer = vi.hoisted(() => vi.fn());
const items = vi.hoisted(() => ({ current: [] as unknown[] }));
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
vi.mock("@/hooks/use-approvals", () => ({
  useApprovalDetail: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-answer-approval", () => ({
  useAnswerApproval: () => ({
    answer: (...a: unknown[]) => {
      answer(...a);
      return Promise.resolve({ status: "decided", approved: true });
    },
    isPending: false,
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const host = (id: string, tool: string, action: string, resource: string) =>
  hostApprovalAsQueueItem({
    id,
    hostId: "h",
    toolId: tool,
    actionId: action,
    resource,
    summary: "",
    highRisk: false,
    createdAt: "2026-10-31T10:00:00Z",
    expiresAt: "2026-10-31T10:10:00Z",
  });

function ui(locale = "en") {
  const approvals = locale === "en" ? approvalsEn : approvalsAr;
  const personal = locale === "en" ? personalEn : personalAr;
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ approvals, personal, common: commonEn, risk: riskEn }}
    >
      <ApprovalsQueueView />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  answer.mockReset();
  items.current = [
    host("a1", "host.cursor", "file.read", "~/.aws/credentials"),
    host("a2", "host.windsurf", "shell", "npm test"),
  ];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ApprovalsQueueView", () => {
  it("shows the queue and the context of the first request", () => {
    ui();
    expect(screen.getByTestId("queue").querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByTestId("context-panel")).toHaveTextContent("~/.aws/credentials");
  });

  it("J moves to the next request, K back; A answers the selected one once", () => {
    ui();
    fireEvent.keyDown(document.body, { key: "j" });
    expect(screen.getByTestId("context-panel")).toHaveTextContent("npm test");
    fireEvent.keyDown(document.body, { key: "k" });
    expect(screen.getByTestId("context-panel")).toHaveTextContent("~/.aws/credentials");
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.keyDown(document.body, { key: "a" });
    expect(answer).toHaveBeenCalledWith("approve_once", {});
  });

  it("8 hours and make-a-rule are buttons only, with their own choices", () => {
    ui();
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.click(screen.getByRole("button", { name: "Approve for 8 hours" }));
    expect(answer).toHaveBeenCalledWith("approve_8h", {});
  });

  it("a new-site prompt reads as a connection and offers Always for this site, not a rule", () => {
    items.current = [host("s1", "host.claude-code", "site.connect", "example.org")];
    ui();
    expect(screen.getByTestId("context-panel")).toHaveTextContent(
      "Claude Code wants to connect to example.org",
    );
    expect(screen.queryByRole("button", { name: "Approve + make rule" })).toBeNull();
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.click(screen.getByRole("button", { name: "Always allow this site" }));
    expect(answer).toHaveBeenCalledWith("approve_always", {});
  });

  it("is empty and honest with nothing waiting, and renders in Arabic", () => {
    items.current = [];
    ui("ar");
    expect(screen.getByText("لا شيء ينتظرك.")).toBeInTheDocument();
  });
});

describe("deciding safely from the queue", () => {
  it("a click in the first 750 ms after a request appears does nothing", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: /Just this once/ }));
    expect(answer).not.toHaveBeenCalled();
  });

  it("names the device and its owner, and shows only what this person may answer, with why", () => {
    items.current = [
      {
        ...host("o1", "host.cursor", "shell", "rm -rf build"),
        hostName: "dev-laptop",
        ownerName: "Sara",
        allowedDecisions: ["deny"],
        needs: "needs_admin",
        why: "high_risk",
      },
    ];
    ui();
    expect(screen.getByTestId("context-panel")).toHaveTextContent(
      "Cursor on Sara's dev-laptop wants to run rm -rf build",
    );
    expect(screen.queryByRole("button", { name: /Just this once/ })).toBeNull();
    expect(
      screen.getByText(/needs a workspace approver because it is high risk/),
    ).toBeInTheDocument();
  });

  it("flags hidden direction-changing characters in what the agent sent", () => {
    items.current = [host("b1", "host.cursor", "file.read", "report-weekly\u202Efdp.exe")];
    ui();
    expect(screen.getByText(/hidden or direction-changing characters/)).toBeInTheDocument();
    expect(screen.getByTestId("context-panel")).not.toHaveTextContent("\u202E");
  });
});

describe("own high-risk request in a personal workspace", () => {
  it("asks to confirm it's you instead of approving, and the A key does nothing", () => {
    items.current = [
      {
        ...host("p1", "host.vault", "secret.use", "AWS_KEY"),
        highRisk: true,
        allowedDecisions: ["approve_once", "deny"],
        why: "handover",
        needs: null,
        stepUpNeeded: true,
      },
    ];
    ui();
    expect(screen.getByRole("button", { name: "Confirm it's you to approve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Just this once/ })).toBeNull();
    expect(
      screen.getByText(/hands over a secret\. To approve it, confirm it's you/),
    ).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.keyDown(document.body, { key: "a" });
    expect(answer).not.toHaveBeenCalled();
  });

  it("after a fresh sign-in it approves, and says it will be recorded as self-approved", () => {
    items.current = [
      {
        ...host("p2", "host.vault", "secret.use", "AWS_KEY"),
        allowedDecisions: ["approve_once", "deny"],
        why: "high_risk",
        needs: null,
        stepUpNeeded: false,
      },
    ];
    ui();
    expect(
      screen.getByText(/recorded as self-approved, high risk, re-confirmed/),
    ).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
    fireEvent.click(screen.getByRole("button", { name: /Just this once/ }));
    expect(answer).toHaveBeenCalledWith("approve_once", {});
  });
});

describe("spoofed names", () => {
  it("a device name with bidi overrides renders isolated and cleaned, and shows the warning", () => {
    items.current = [
      {
        ...host("d1", "host.cursor", "shell", "npm test"),
        hostName: "laptop\u202Egnp.exe",
        ownerName: "Sa\u2066ra",
      },
    ];
    ui();
    const panel = screen.getByTestId("context-panel");
    expect(panel).not.toHaveTextContent("\u202E");
    expect(panel).not.toHaveTextContent("\u2066");
    expect(panel.querySelectorAll("h2 bdi").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/hidden or direction-changing characters/)).toBeInTheDocument();
  });

  it("is isolated in Arabic too", () => {
    items.current = [{ ...host("d2", "host.cursor", "shell", "npm test"), hostName: "x\u202Ey" }];
    ui("ar");
    expect(screen.getByTestId("context-panel").querySelector("h2")).not.toHaveTextContent("\u202E");
    expect(screen.getByText(/أحرف مخفية/)).toBeInTheDocument();
  });
});

describe("opt-in sound and push helpers", () => {
  it("the chime is off until turned on", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    expect(chimeEnabled(storage)).toBe(false);
    setChime(storage, true);
    expect(chimeEnabled(storage)).toBe(true);
    setChime(storage, false);
    expect(chimeEnabled(storage)).toBe(false);
  });

  it("decodes a URL-safe VAPID key", () => {
    expect(Array.from(urlBase64ToBytes("AQID"))).toEqual([1, 2, 3]);
    expect(Array.from(urlBase64ToBytes("-_8"))).toEqual([251, 255]);
  });
});
