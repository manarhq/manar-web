import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentQuarantinePanel } from "@/components/manar/agents/agent-quarantine";
import { isRoleManager } from "@/lib/roles";
import agentsEn from "@/messages/en/agents.json";
import agentsAr from "@/messages/ar/agents.json";
import commonEn from "@/messages/en/common.json";

/**
 * The watcher's quarantine (manar-api ADR-0009). What this panel must never do: offer a
 * release to a role manar-api would refuse, claim a release happened when the API said there
 * was nothing to release (404), or present the model-written explanation as verified fact.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/use-actor-name", () => ({
  useActorNameResolver: () => (actor: { id?: string }) => actor.id ?? "unknown",
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const useAgentQuarantine = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-quarantines", () => ({
  useAgentQuarantine,
  useReleaseQuarantine: () => ({ mutate, reset: vi.fn(), isPending: false, isError: false }),
}));

const q = agentsEn.quarantine;

const activeQuarantine = {
  id: "q-1",
  agentId: "agent-1",
  active: true,
  reason: "destructive_burst",
  detector: "burst_v1",
  evidence: ["dec-1", "dec-2"],
  explanationEn: "Three account disables in one minute.",
  explanationAr: "ثلاث عمليات تعطيل حسابات في دقيقة واحدة.",
  quarantinedByAgentId: "watcher-1",
  decisionId: "dec-9",
  quarantinedAt: "2026-10-09T08:00:00.000Z",
  releasedBy: null,
  releasedAt: null,
  releaseNote: null,
};

function renderPanel(canManage: boolean) {
  return render(
    <NextIntlClientProvider
      locale="en"
      timeZone="UTC"
      messages={{ agents: agentsEn, common: commonEn }}
    >
      <AgentQuarantinePanel agentId="agent-1" canManage={canManage} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  useAgentQuarantine.mockReset();
  mutate.mockReset();
  toast.success.mockReset();
});

describe("quarantine role gating", () => {
  it("only Security Admin and Tenant Owner may manage quarantines", () => {
    expect(isRoleManager(["SECURITY_ADMIN"])).toBe(true);
    expect(isRoleManager(["TENANT_OWNER"])).toBe(true);
    for (const role of [
      "AI_GOVERNANCE_MANAGER",
      "SOC_OPERATOR",
      "APPROVER",
      "AUDITOR",
      "READ_ONLY",
    ]) {
      expect(isRoleManager([role]), role).toBe(false);
    }
  });

  it("other roles get no release button, no fetch, and no all-clear", () => {
    useAgentQuarantine.mockReturnValue({ isPending: false, isError: false, data: undefined });
    renderPanel(false);
    expect(useAgentQuarantine).toHaveBeenCalledWith("agent-1", false);
    expect(screen.queryByRole("button", { name: q.release })).toBeNull();
    expect(screen.getByText(q.roleNote)).toBeDefined();
  });

  it("allowed roles see the release button on an active quarantine", () => {
    useAgentQuarantine.mockReturnValue({
      isPending: false,
      isError: false,
      data: activeQuarantine,
    });
    renderPanel(true);
    expect(screen.getByRole("button", { name: q.release })).toBeDefined();
    expect(screen.getAllByText(q.badge).length).toBeGreaterThan(0);
  });

  it("a failed read says so instead of rendering nothing", () => {
    useAgentQuarantine.mockReturnValue({ isPending: false, isError: true, data: undefined });
    renderPanel(true);
    expect(screen.getByText(q.loadError)).toBeDefined();
  });
});

describe("quarantine release, 404 path", () => {
  it("says there is no active quarantine and never claims a release", async () => {
    const refetch = vi.fn();
    useAgentQuarantine.mockReturnValue({
      isPending: false,
      isError: false,
      data: activeQuarantine,
      refetch,
    });
    mutate.mockImplementation((_note: string, opts: { onError: (e: unknown) => void }) =>
      opts.onError({ statusCode: 404, message: 'Agent "agent-1" has no active quarantine' }),
    );
    renderPanel(true);

    fireEvent.click(screen.getByRole("button", { name: q.release }));
    fireEvent.click(await screen.findByRole("button", { name: q.confirm }));

    expect(await screen.findByText(q.noActive)).toBeDefined();
    expect(refetch).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(q.releasedToast)).toBeNull();
    expect(screen.queryByText(q.releasedBadge)).toBeNull();
  });
});

describe("model-written explanations", () => {
  it("are labelled generated, not verified, each in its own language and direction", () => {
    useAgentQuarantine.mockReturnValue({
      isPending: false,
      isError: false,
      data: activeQuarantine,
    });
    const { container } = renderPanel(true);

    expect(screen.getAllByText(q.generatedNotVerified)).toHaveLength(2);
    const en = container.querySelector('[data-explanation="en"]');
    const ar = container.querySelector('[data-explanation="ar"]');
    expect(en?.getAttribute("dir")).toBe("ltr");
    expect(en?.getAttribute("lang")).toBe("en");
    expect(ar?.getAttribute("dir")).toBe("rtl");
    expect(ar?.getAttribute("lang")).toBe("ar");
    expect(ar?.textContent).toBe(activeQuarantine.explanationAr);
  });

  it("the Arabic messages carry the same label", () => {
    expect(agentsAr.quarantine.generatedNotVerified).toBeTruthy();
    expect(Object.keys(agentsAr.quarantine).sort()).toEqual(Object.keys(q).sort());
  });
});
