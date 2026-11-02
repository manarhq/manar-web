import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectionCard } from "@/components/manar/personal/protection-card";
import type { ProtectionStatus } from "@/lib/personal/ai-tools";
import { restartCommand } from "@/lib/personal/ai-tools";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const state = vi.hoisted(() => ({
  q: {} as Record<string, unknown>,
  decide: vi.fn(),
  protect: vi.fn(),
}));
vi.mock("@/hooks/use-ai-tools", () => ({
  useProtection: () => state.q,
  useSetProtection: () => ({ mutate: state.protect, isPending: false }),
}));
vi.mock("@/hooks/use-hosts", () => ({
  useHostDecision: () => ({ mutate: state.decide, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function ui(locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      now={new Date("2026-11-03T12:00:00Z")}
      messages={{ personal: locale === "en" ? personalEn : personalAr }}
    >
      <ProtectionCard />
    </NextIntlClientProvider>,
  );
}

const status = (over: Partial<ProtectionStatus>): ProtectionStatus => ({
  ok: false,
  checkedAt: "2026-11-03T12:00:00Z",
  devices: [
    { hostId: "h1", hostname: "laptop", os: "Ubuntu (linux)", status: "APPROVED", online: true },
    { hostId: "h2", hostname: "work-pc", os: "Windows 11", status: "APPROVED", online: false },
  ],
  problems: [],
  ...over,
});

beforeEach(() => {
  state.decide.mockReset();
  state.protect.mockReset();
});
afterEach(cleanup);

describe("Am I protected?", () => {
  it("says All protected only when the API says ok", () => {
    state.q = { data: status({ ok: true }) };
    ui();
    expect(screen.getByTestId("protection-card")).toHaveAttribute("data-state", "ok");
    expect(screen.getByRole("heading", { name: "All protected" })).toBeInTheDocument();
  });

  it("never reads a failed check as protected", () => {
    state.q = { isError: true, error: { statusCode: 503 }, refetch: vi.fn() };
    ui();
    expect(screen.getByTestId("protection-card")).toHaveAttribute("data-state", "unknown");
    expect(screen.queryByText("All protected")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(state.q.refetch).toHaveBeenCalled();
  });

  it("shows nothing to a role that cannot read devices", () => {
    state.q = { isError: true, error: { statusCode: 403 } };
    ui();
    expect(screen.queryByTestId("protection-card")).toBeNull();
  });

  it("gives every problem one sentence and one button that fixes it", () => {
    state.q = {
      data: status({
        problems: [
          { code: "device_pending", hostId: "h3", hostname: "new-pc" },
          {
            code: "tool_off",
            hostId: "h1",
            hostname: "laptop",
            toolId: "host.claude-code",
            toolName: "Claude Code",
          },
          {
            code: "tool_seen_only",
            hostId: "h1",
            hostname: "laptop",
            toolId: "host.chatgpt-desktop",
            toolName: "ChatGPT desktop",
          },
          { code: "module_down", hostId: "h1", hostname: "laptop", module: "jail" },
          {
            code: "device_offline",
            hostId: "h2",
            hostname: "work-pc",
            lastSeenAt: "2026-11-03T10:00:00Z",
          },
        ],
      }),
    };
    ui();
    expect(screen.getByRole("heading", { name: "5 things to fix" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    for (const li of items) expect(li.querySelectorAll("button, a")).toHaveLength(1);

    expect(screen.getByText("new-pc is waiting for your approval.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(state.decide.mock.calls[0]?.[0]).toEqual({ id: "h3", decision: "approve" });

    expect(
      screen.getByText("Claude Code on laptop is not protected. Protection was turned off."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Protect" }));
    expect(state.protect.mock.calls[0]?.[0]).toEqual({
      hostId: "h1",
      toolId: "host.claude-code",
      protect: true,
    });

    // Plain names, never the internal code name.
    expect(
      screen.getByText("Network control stopped on laptop and is restarting."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/JAIL/)).toBeNull();
    expect(screen.getByText(/Manar on work-pc last checked in 2 hours ago/)).toBeInTheDocument();
  });

  it("points to Add device when there is no device", () => {
    state.q = { data: status({ devices: [], problems: [{ code: "no_device" }] }) };
    ui();
    expect(screen.getByRole("link", { name: "Add a device" })).toHaveAttribute(
      "href",
      "/add-device",
    );
  });

  it("speaks Arabic", () => {
    state.q = { data: status({ problems: [{ code: "no_device" }] }) };
    ui("ar");
    expect(screen.getByRole("heading", { name: "أمر واحد لإصلاحه" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "أضف جهازًا" })).toBeInTheDocument();
  });

  it("picks the restart command by the device's OS", () => {
    expect(restartCommand("Windows 11 Pro")).toBe("Restart-Service ManarEdge");
    expect(restartCommand("Ubuntu 26.04 (linux)")).toBe("sudo systemctl restart manar-edge");
  });
});
