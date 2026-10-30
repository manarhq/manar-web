import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BeamApprovalCard } from "@/components/manar/personal/beam-approval-card";
import { DevicesCard } from "@/components/manar/personal/devices-card";
import { SecretsCard } from "@/components/manar/personal/secrets-card";
import { WeeklyReportCard } from "@/components/manar/personal/weekly-report-card";
import type { ApprovalSummary } from "@/hooks/use-approvals";
import type { Host } from "@/hooks/use-hosts";
import commonEn from "@/messages/en/common.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";
import emptyStateMessages from "@/messages/en/errors.json";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-approvals", () => ({
  useApprovalDetail: () => ({ data: { requiredReason: "policy_requires_approval" } }),
}));
vi.mock("@/hooks/use-answer-approval", () => ({
  useAnswerApproval: () => ({
    answer: (...args: unknown[]) => {
      mutate(...args);
      return Promise.resolve({ status: "decided", approved: true });
    },
    isPending: false,
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const approval: ApprovalSummary = {
  id: "apr-1",
  taskId: "t",
  agentId: "a",
  toolId: "host.cursor",
  actionId: "file.read",
  resource: "~/.aws/credentials",
  riskScore: 70,
  policyVersionId: null,
  status: "PENDING",
  requestedAt: "2026-10-31T10:42:00Z",
  expiresAt: "2026-10-31T11:42:00Z",
};

function ui(node: ReactElement, locale = "en") {
  const personal = locale === "en" ? personalEn : personalAr;
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ personal, common: commonEn, errors: emptyStateMessages }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => mutate.mockReset());
afterEach(cleanup);

describe("BeamApprovalCard", () => {
  it("names the tool and the exact thing it wants, and why", () => {
    ui(<BeamApprovalCard approval={approval} />);
    expect(screen.getByText("Cursor wants to file.read ~/.aws/credentials")).toBeInTheDocument();
    expect(screen.getByText("Your rules say this needs a person.")).toBeInTheDocument();
  });

  it("hides the 8 hour and rule buttons unless the extendedGrants flag is on", () => {
    ui(<BeamApprovalCard approval={approval} />);
    expect(screen.queryByRole("button", { name: /8 hours/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /make rule/i })).toBeNull();
    cleanup();
    ui(<BeamApprovalCard approval={approval} extendedGrants />);
    expect(screen.getByRole("button", { name: /8 hours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make rule/i })).toBeInTheDocument();
  });

  it("8 hours and make-a-rule send the right choices", () => {
    ui(<BeamApprovalCard approval={approval} extendedGrants />);
    fireEvent.click(screen.getByRole("button", { name: /8 hours/i }));
    expect(mutate).toHaveBeenLastCalledWith("approve_8h", {});
  });

  it("make-a-rule approves once and asks for the rule draft", () => {
    ui(<BeamApprovalCard approval={approval} extendedGrants />);
    fireEvent.click(screen.getByRole("button", { name: /make rule/i }));
    expect(mutate).toHaveBeenLastCalledWith("approve_once", { makeRule: true });
  });

  it("renders in Arabic", () => {
    ui(<BeamApprovalCard approval={approval} />, "ar");
    expect(screen.getByRole("button", { name: "موافقة مرة واحدة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رفض" })).toBeInTheDocument();
  });
});

describe("BeamApprovalCard keyboard", () => {
  it("A is approve once only, even when longer grants are offered", () => {
    vi.useFakeTimers();
    ui(<BeamApprovalCard approval={approval} extendedGrants />);
    act(() => void vi.advanceTimersByTime(800));
    fireEvent.keyDown(document.body, { key: "a" });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith("approve_once", {});
    vi.useRealTimers();
  });
});

describe("cards and empty states", () => {
  it("secrets and report cards show an honest empty state, not zeros", () => {
    ui(
      <>
        <SecretsCard />
        <WeeklyReportCard />
      </>,
    );
    expect(screen.getByText(/No secrets touched/)).toBeInTheDocument();
    expect(screen.getByText(/first weekly card appears/)).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("report card shows totals when given them, and only totals", () => {
    ui(
      <WeeklyReportCard
        report={{
          from: "2026-10-24",
          to: "2026-10-30",
          actions: 1412,
          asked: 9,
          blocked: 3,
          secretsKeptSafe: 2,
        }}
      />,
    );
    expect(screen.getByText("1,412")).toBeInTheDocument();
    expect(
      screen.getByText("Only totals are shared. Never file names or prompts."),
    ).toBeInTheDocument();
  });

  it("devices: chips carry text and shape, tools show an empty state until reported", () => {
    const host = {
      id: "h1",
      hostname: "Work laptop",
      os: "Windows 11",
      status: "APPROVED",
      lastSeenAt: "2026-10-31T10:41:00Z",
    } as Host;
    const now = Date.parse("2026-10-31T10:42:00Z");
    ui(<DevicesCard hosts={[host]} toolsByHost={new Map()} now={now} />);
    expect(screen.getByText("Work laptop")).toBeInTheDocument();
    expect(screen.getByText(/online/)).toBeInTheDocument();
    expect(screen.getByText(/No AI tools reported/)).toBeInTheDocument();
    cleanup();
    ui(
      <DevicesCard
        hosts={[host]}
        now={now}
        toolsByHost={
          new Map([["h1", [{ toolId: "host.cursor", allowed: 88, waiting: 1, blocked: 0 }]]])
        }
      />,
    );
    expect(screen.getByText("88 allowed")).toBeInTheDocument();
    expect(screen.getByText("1 waiting")).toBeInTheDocument();
    expect(screen.queryByText(/0 blocked/)).toBeNull();
  });
});

describe("personal messages", () => {
  function keys(node: unknown, prefix = ""): string[] {
    if (node === null || typeof node !== "object") return [prefix];
    return Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  it("have the same keys in English and Arabic", () => {
    expect(keys(personalAr).sort()).toEqual(keys(personalEn).sort());
  });
});
