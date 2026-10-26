import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentNetworkPanel, checkEgressHost } from "@/components/manar/agents/agent-network-panel";
import agentsEn from "@/messages/en/agents.json";
import agentsAr from "@/messages/ar/agents.json";
import commonEn from "@/messages/en/common.json";

/**
 * The agent's Network panel (manar-edge design section 4). What it must never do: show a peer
 * as active when manar-api did not say so (not enrolled, cut, or a failed read), compute a cut
 * reason itself, fetch edge data for a role manar-api would refuse, or send a host the API's
 * syntax rules would reject.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const hooks = vi.hoisted(() => ({
  useAgentEdge: vi.fn(),
  useEgressRules: vi.fn(),
  useEgressDecisions: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  addState: { isPending: false, isError: false, error: null as unknown },
}));
vi.mock("@/hooks/use-edge", () => ({
  useAgentEdge: hooks.useAgentEdge,
  useEgressRules: hooks.useEgressRules,
  useEgressDecisions: hooks.useEgressDecisions,
  useAddEgressRule: () => ({ mutate: hooks.add, ...hooks.addState }),
  useRemoveEgressRule: () => ({ mutate: hooks.remove, isPending: false, isError: false }),
}));

const n = agentsEn.network;
const ok = <T,>(data: T) => ({ isPending: false, isError: false, data, refetch: vi.fn() });
const failed = {
  isPending: false,
  isError: true,
  data: undefined,
  error: { statusCode: 503, message: "down" },
  refetch: vi.fn(),
};

const rule = {
  id: "r-1",
  agentId: "agent-1",
  host: "api.example.com",
  reason: "ticketing",
  createdBy: "u-1",
  createdAt: "2026-10-26T08:00:00.000Z",
};

function renderPanel(canManage = true) {
  return render(
    <NextIntlClientProvider
      locale="en"
      timeZone="UTC"
      messages={{ agents: agentsEn, common: commonEn }}
    >
      <AgentNetworkPanel agentId="agent-1" canManage={canManage} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  hooks.useAgentEdge.mockReturnValue(ok({ enrolled: false }));
  hooks.useEgressRules.mockReturnValue(ok([]));
  hooks.useEgressDecisions.mockReturnValue(ok([]));
  hooks.addState = { isPending: false, isError: false, error: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("role gating", () => {
  it("other roles get a note, no fetch and no status", () => {
    renderPanel(false);
    expect(screen.getByText(n.roleNote)).toBeDefined();
    expect(hooks.useAgentEdge).not.toHaveBeenCalled();
    expect(hooks.useEgressRules).not.toHaveBeenCalled();
    expect(hooks.useEgressDecisions).not.toHaveBeenCalled();
    expect(screen.queryByText(n.active)).toBeNull();
    expect(screen.queryByRole("button", { name: n.add })).toBeNull();
  });
});

describe("edge status, as the API reports it", () => {
  it("not enrolled says so and never shows active or cut", () => {
    renderPanel();
    expect(screen.getByText(n.notOnEdge)).toBeDefined();
    expect(screen.getByText(n.notOnEdgeBody)).toBeDefined();
    expect(screen.queryByText(n.active)).toBeNull();
    expect(screen.queryByText(n.cut)).toBeNull();
  });

  it("cut shows the API's reasons verbatim and no active badge", () => {
    hooks.useAgentEdge.mockReturnValue(
      ok({
        enrolled: true,
        state: "cut",
        cutReasons: ["agent_quarantined"],
        address: "100.88.0.17/32",
        updatedAt: "2026-10-26T10:00:00.000Z",
      }),
    );
    renderPanel();
    expect(screen.getByText(n.cut)).toBeDefined();
    expect(within(screen.getByTestId("cut-reasons")).getByText("agent_quarantined")).toBeDefined();
    expect(screen.getByText("100.88.0.17/32")).toBeDefined();
    expect(screen.queryByText(n.active)).toBeNull();
  });

  it("active shows the overlay address and no cut reasons", () => {
    hooks.useAgentEdge.mockReturnValue(
      ok({ enrolled: true, state: "active", address: "100.88.0.4/32" }),
    );
    renderPanel();
    expect(screen.getByText(n.active)).toBeDefined();
    expect(screen.getByText("100.88.0.4/32")).toBeDefined();
    expect(screen.queryByTestId("cut-reasons")).toBeNull();
  });

  it("a failed read is a failure, never 'not on the edge' or active", () => {
    hooks.useAgentEdge.mockReturnValue(failed);
    hooks.useEgressRules.mockReturnValue(failed);
    hooks.useEgressDecisions.mockReturnValue(failed);
    renderPanel();
    expect(screen.getAllByTestId("api-error-state")).toHaveLength(3);
    expect(screen.queryByText(n.notOnEdge)).toBeNull();
    expect(screen.queryByText(n.active)).toBeNull();
    expect(screen.queryByText(n.allowListEmpty)).toBeNull();
    expect(screen.queryByText(n.decisionsEmpty)).toBeNull();
  });
});

describe("host syntax mirrors manar-api's normalizeEgressHost", () => {
  it.each([
    ["api.example.com", "api.example.com"],
    ["  API.Example.COM ", "api.example.com"],
    ["*.example.com", "*.example.com"],
    ["a-b.example.co.uk", "a-b.example.co.uk"],
  ])("accepts %j", (input, expected) => {
    expect(checkEgressHost(input)).toBe(expected);
  });

  it.each([
    "",
    "example",
    "*.com",
    "10.0.0.1",
    "example.com:443",
    "example.com/path",
    "https://example.com",
    "a.*.example.com",
    "*example.com",
    "-bad.example.com",
    "bad-.example.com",
    "host.local",
    "svc.internal",
    "foo.localhost",
    "x.onion",
    "1.in-addr.arpa",
    "a.test",
    "a.invalid",
    "a.alt",
    "under_score.example.com",
    `${"a".repeat(64)}.com`,
    `${"a.".repeat(126)}com`,
  ])("refuses %j", (input) => {
    expect(checkEgressHost(input)).toBeNull();
  });
});

describe("allow-list editor", () => {
  it("refuses an invalid host locally and sends nothing", () => {
    renderPanel();
    const input = screen.getByLabelText(n.hostLabel);
    fireEvent.change(input, { target: { value: "10.0.0.1" } });
    fireEvent.click(screen.getByRole("button", { name: n.add }));
    expect(hooks.add).not.toHaveBeenCalled();
    expect(screen.getByText(n.hostInvalid)).toBeDefined();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("sends the normalized host and the reason", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(n.hostLabel), {
      target: { value: " *.Example.com " },
    });
    fireEvent.change(screen.getByLabelText(n.reasonLabel), { target: { value: " vendor " } });
    fireEvent.click(screen.getByRole("button", { name: n.add }));
    expect(hooks.add).toHaveBeenCalledWith(
      { host: "*.example.com", reason: "vendor" },
      expect.any(Object),
    );
  });

  it("omits an empty reason", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(n.hostLabel), {
      target: { value: "api.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: n.add }));
    expect(hooks.add).toHaveBeenCalledWith({ host: "api.example.com" }, expect.any(Object));
  });

  it("shows the API's refusal (the API is authoritative) and a 409 as a duplicate", () => {
    hooks.addState = {
      isPending: false,
      isError: true,
      error: { statusCode: 400, message: "host must be under a public top-level domain" },
    };
    renderPanel();
    expect(screen.getByRole("alert").textContent).toBe(
      "host must be under a public top-level domain",
    );
    cleanup();
    hooks.addState = { isPending: false, isError: true, error: { statusCode: 409 } };
    renderPanel();
    expect(screen.getByRole("alert").textContent).toBe(n.duplicate);
  });

  it("lists rules and removes one by id from a labelled button", () => {
    hooks.useEgressRules.mockReturnValue(ok([rule]));
    renderPanel();
    expect(screen.getByText("api.example.com")).toBeDefined();
    expect(screen.getByText("ticketing")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Remove api.example.com" }));
    expect(hooks.remove).toHaveBeenCalledWith("r-1");
  });

  it("an empty list says so", () => {
    renderPanel();
    expect(screen.getByText(n.allowListEmpty)).toBeDefined();
  });
});

describe("recent egress decisions", () => {
  it("shows each decision from its event type, with host, port and the gateway's reason", () => {
    hooks.useEgressDecisions.mockReturnValue(
      ok([
        {
          eventId: "e-1",
          eventType: "agent.egress.denied",
          timestamp: "2026-10-26T10:00:00.000Z",
          data: { host: "evil.example.net", port: 443, reason: "host_not_allowed" },
        },
        {
          eventId: "e-2",
          eventType: "agent.egress.allowed",
          timestamp: "2026-10-26T09:59:00.000Z",
          data: { host: "api.example.com", port: 443, reason: "allowed" },
        },
      ]),
    );
    renderPanel();
    const rows = screen.getAllByRole("row").slice(1);
    const decisionRows = rows.filter((row) => within(row).queryByRole("link"));
    expect(decisionRows).toHaveLength(2);
    expect(within(decisionRows[0]!).getByText(n.denied)).toBeDefined();
    expect(within(decisionRows[0]!).queryByText(n.allowed)).toBeNull();
    expect(within(decisionRows[0]!).getByText("evil.example.net:443")).toBeDefined();
    expect(within(decisionRows[0]!).getByText("host_not_allowed")).toBeDefined();
    expect(within(decisionRows[0]!).getByRole("link").getAttribute("href")).toBe("/audit/e-1");
    expect(within(decisionRows[1]!).getByText(n.allowed)).toBeDefined();
  });

  it("an empty trail says so", () => {
    renderPanel();
    expect(screen.getByText(n.decisionsEmpty)).toBeDefined();
  });
});

describe("i18n", () => {
  it("Arabic has every Network string", () => {
    expect(Object.keys(agentsAr.network).sort()).toEqual(Object.keys(n).sort());
  });
});
