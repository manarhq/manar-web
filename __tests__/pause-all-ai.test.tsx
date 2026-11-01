import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PauseCard } from "@/components/manar/personal/pause-card";
import { ApprovalExplanation } from "@/components/manar/approvals/approval-explanation";
import { hostApprovalAsQueueItem } from "@/hooks/use-pending-approvals-count";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const state = vi.hoisted(() => ({
  data: undefined as
    undefined | { paused: boolean; pausedAt: string | null; pausedBy: string | null },
  mutate: vi.fn(),
}));
vi.mock("@/hooks/use-pause", () => ({
  usePauseStatus: () => ({ data: state.data }),
  useSetPause: () => ({ mutate: state.mutate, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function ui(node: React.ReactNode, locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ personal: locale === "en" ? personalEn : personalAr }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => state.mutate.mockReset());
afterEach(cleanup);

describe("Pause all AI", () => {
  it("shows nothing when the state cannot be read", () => {
    state.data = undefined;
    ui(<PauseCard />);
    expect(screen.queryByTestId("pause-card")).toBeNull();
  });

  it("pauses with one press, and resumes from the banner", () => {
    state.data = { paused: false, pausedAt: null, pausedBy: null };
    const { unmount } = ui(<PauseCard />);
    fireEvent.click(screen.getByRole("button", { name: "Pause all AI" }));
    expect(state.mutate.mock.calls[0]?.[0]).toBe(true);
    unmount();

    state.data = { paused: true, pausedAt: "2026-11-01T10:00:00Z", pausedBy: "u" };
    ui(<PauseCard />);
    expect(screen.getByTestId("pause-card")).toHaveAttribute("data-paused", "true");
    expect(screen.getByText("AI is paused")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Resume AI/ }));
    expect(state.mutate.mock.calls[1]?.[0]).toBe(false);
  });

  it("speaks Arabic", () => {
    state.data = { paused: false, pausedAt: null, pausedBy: null };
    ui(<PauseCard />, "ar");
    expect(screen.getByRole("button", { name: "إيقاف كل الذكاء الاصطناعي" })).toBeInTheDocument();
  });
});

describe("plain-words explanation", () => {
  const item = hostApprovalAsQueueItem({
    id: "a",
    hostId: "h",
    toolId: "host.cursor",
    actionId: "bash",
    resource: "ls",
    summary: "",
    highRisk: false,
    createdAt: "2026-11-01T10:00:00Z",
    expiresAt: "2026-11-01T10:02:00Z",
    explanation: { en: "It wants to run a command.", ar: "يريد تشغيل أمر." },
  });

  it("shows the text in the page language and the 2-minute rule", () => {
    ui(<ApprovalExplanation approval={item} />);
    expect(screen.getByTestId("risk-explanation")).toHaveTextContent("It wants to run a command.");
    expect(screen.getByText(/2 minutes/)).toBeInTheDocument();
    cleanup();
    ui(<ApprovalExplanation approval={item} />, "ar");
    expect(screen.getByTestId("risk-explanation")).toHaveTextContent("يريد تشغيل أمر.");
  });

  it("shows only the rule when an older API sent no explanation", () => {
    ui(<ApprovalExplanation approval={{ ...item, explanation: undefined }} />);
    expect(screen.queryByTestId("risk-explanation")).toBeNull();
  });
});
