import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentKillSwitchButton } from "@/components/manar/agents/agent-kill-switch-button";
import { findActiveAgentKillSwitch } from "@/hooks/use-agents";
import agentsEn from "@/messages/en/agents.json";
import agentsAr from "@/messages/ar/agents.json";

/** A kill switch shown as "off" while it is on is the failure this file guards against. */

const useAgentKillSwitch = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-agents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-agents")>()),
  useAgentKillSwitch,
  useSetAgentKillSwitch: () => ({ isPending: false, mutate: vi.fn() }),
}));

const ks = (targetId: string) => ({ id: `ks-${targetId}`, targetId }) as never;

afterEach(() => {
  cleanup();
  useAgentKillSwitch.mockReset();
});

describe("findActiveAgentKillSwitch", () => {
  it("finds a switch on page 2", async () => {
    const pages: Record<string, { items: never[]; nextCursor: string | null }> = {
      first: { items: [ks("other-1"), ks("other-2")], nextCursor: "c2" },
      c2: { items: [ks("agent-1")], nextCursor: null },
    };
    const found = await findActiveAgentKillSwitch(async (c) => pages[c ?? "first"], "agent-1");
    expect(found).toMatchObject({ targetId: "agent-1" });
  });

  it("returns null only after the last page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [ks("other")], nextCursor: "c2" })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    expect(await findActiveAgentKillSwitch(fetchPage, "agent-1")).toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("throws, never returns null, when a page fails", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [ks("other")], nextCursor: "c2" })
      .mockRejectedValueOnce(new Error("503"));
    await expect(findActiveAgentKillSwitch(fetchPage, "agent-1")).rejects.toThrow("503");
  });

  it("throws on a repeated cursor instead of looping or reporting off", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], nextCursor: "same" });
    await expect(findActiveAgentKillSwitch(fetchPage, "agent-1")).rejects.toThrow();
  });
});

describe("AgentKillSwitchButton", () => {
  const renderButton = () =>
    render(
      <NextIntlClientProvider locale="en" messages={{ agents: agentsEn }}>
        <AgentKillSwitchButton agentId="agent-1" />
      </NextIntlClientProvider>,
    );

  it("shows unknown, not activate, when the state could not be read", () => {
    useAgentKillSwitch.mockReturnValue({ isPending: false, isError: true, data: undefined });
    renderButton();
    expect(screen.getByText(agentsEn.killSwitch.unknown)).toBeDefined();
    expect(screen.queryByText(agentsEn.killSwitch.activate)).toBeNull();
    expect(screen.queryByText(agentsEn.killSwitch.release)).toBeNull();
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows unknown while loading", () => {
    useAgentKillSwitch.mockReturnValue({ isPending: true, isError: false, data: undefined });
    renderButton();
    expect(screen.getByText(agentsEn.killSwitch.unknown)).toBeDefined();
  });

  it("offers release when the switch is on", () => {
    useAgentKillSwitch.mockReturnValue({ isPending: false, isError: false, data: ks("agent-1") });
    renderButton();
    expect(screen.getByText(agentsEn.killSwitch.release)).toBeDefined();
  });

  it("has the unknown label in Arabic", () => {
    expect(agentsAr.killSwitch.unknown).toBeTruthy();
    expect(agentsAr.killSwitch.unknown).not.toBe(agentsEn.killSwitch.unknown);
  });
});
