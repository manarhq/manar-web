import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { McpServersView } from "@/components/manar/insight/mcp-servers-view";
import { SessionDetailView } from "@/components/manar/insight/session-detail-view";
import { SessionsView } from "@/components/manar/insight/sessions-view";
import { MCP_FLAGS, knownFlags, type McpServerRow, type SessionDetail } from "@/lib/insight/types";
import commonEn from "@/messages/en/common.json";
import featuresEn from "@/messages/en/features.json";
import insightAr from "@/messages/ar/insight.json";
import insightEn from "@/messages/en/insight.json";

const state = vi.hoisted(() => ({
  servers: undefined as unknown,
  session: undefined as unknown,
  sessions: [] as unknown[],
  hasNextPage: false,
  fetchNextPage: (() => undefined) as () => void,
  devices: [] as unknown[],
}));
vi.mock("@/hooks/use-insight", () => ({
  useMcpServers: () => ({ data: state.servers, isLoading: false, isError: false }),
  useSession: () => ({ data: state.session, isLoading: false, isError: false }),
  useSessions: () => ({
    data: state.sessions,
    isLoading: false,
    isError: false,
    hasNextPage: state.hasNextPage,
    fetchNextPage: state.fetchNextPage,
    isFetchingNextPage: false,
  }),
}));
vi.mock("@/hooks/use-ai-tools", () => ({ useAiTools: () => ({ data: state.devices }) }));
vi.mock("@/hooks/use-features", () => ({
  useShareReport: () => ({ mutate: vi.fn(), isError: false }),
  useRevokeShare: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const server = (over: Partial<McpServerRow>): McpServerRow => ({
  id: "1",
  hostId: "h",
  hostname: "sam-laptop",
  toolId: "host.cursor",
  name: "files",
  transport: "stdio",
  command: "npx",
  argCount: 3,
  url: null,
  package: "some-mcp",
  version: null,
  envKeys: ["GITHUB_TOKEN"],
  lastSeenAt: "2026-11-01T10:00:00Z",
  stale: false,
  flags: [],
  ...over,
});

function ui(node: ReactElement, locale = "en") {
  const ar = locale === "ar";
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={{
        insight: ar ? insightAr : insightEn,
        features: featuresEn,
        common: commonEn,
        personal: {},
      }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}
afterEach(cleanup);

describe("MCP servers page", () => {
  it("explains each flag in plain words, hides arguments and shows variable names only", () => {
    state.servers = [
      server({ flags: ["unknown_publisher", "unpinned_version", "from_the_future"] }),
    ];
    ui(<McpServersView />);
    expect(screen.getByText("Unknown publisher")).toBeInTheDocument();
    expect(screen.getByText(/fetched fresh each time it starts/)).toBeInTheDocument();
    expect(screen.getByText(/3 arguments \(hidden\)/)).toBeInTheDocument();
    expect(screen.getByText(/GITHUB_TOKEN/)).toBeInTheDocument();
    expect(screen.queryByText(/from_the_future/)).not.toBeInTheDocument();
  });

  it("says nothing flagged is not a promise of safety", () => {
    state.servers = [server({ flags: [] })];
    ui(<McpServersView />);
    expect(screen.getByText(/not a promise that the server is safe/)).toBeInTheDocument();
  });

  it("renders in Arabic with a right-to-left safe layout", () => {
    state.servers = [
      server({ flags: ["remote_no_tls"], transport: "http", url: "http://h.example" }),
    ];
    ui(<McpServersView />, "ar");
    expect(screen.getByText(insightAr.mcp.flags.remote_no_tls.label)).toBeInTheDocument();
  });

  it("drops flags it does not know", () => {
    expect(knownFlags(["runs_shell", "zzz"])).toEqual(["runs_shell"]);
  });
});

describe("insight messages", () => {
  const keys = (o: unknown, p = ""): string[] =>
    typeof o === "object" && o ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p];
  it("EN and AR have the same keys, and every flag is explained in both", () => {
    expect(keys(insightAr).sort()).toEqual(keys(insightEn).sort());
    for (const f of MCP_FLAGS) {
      expect(insightEn.mcp.flags[f].body.length).toBeGreaterThan(10);
      expect(insightAr.mcp.flags[f].body.length).toBeGreaterThan(10);
    }
  });
});

describe("session timeline", () => {
  it("lists steps in order, marks the source honestly and offers sharing", () => {
    const s: SessionDetail = {
      id: "abc",
      hostId: "h",
      hostname: "sam-laptop",
      toolId: "host.cursor",
      toolName: "Cursor",
      source: "gap",
      startedAt: "2026-11-01T10:00:00Z",
      endedAt: "2026-11-01T10:05:00Z",
      counts: { commands: 1, files: 1, sites: 0, tools: 0, approvals: 1, secrets: 0, blocked: 0 },
      steps: [
        {
          at: "2026-11-01T10:00:00Z",
          kind: "command",
          action: "shell",
          label: "git push --force",
          decision: "APPROVAL_REQUIRED",
        },
        {
          at: "2026-11-01T10:01:00Z",
          kind: "approval",
          action: "shell",
          label: "git push --force",
          outcome: "denied",
        },
        {
          at: "2026-11-01T10:05:00Z",
          kind: "file",
          action: "edit",
          label: "/home/sam/p/a.ts",
          decision: "ALLOW",
        },
      ],
    };
    state.session = s;
    ui(<SessionDetailView id="abc" />);
    expect(screen.getByText("Grouped by time")).toBeInTheDocument();
    expect(
      screen.getByText(/grouped actions that are less than 30 minutes apart/),
    ).toBeInTheDocument();
    expect(screen.getByText("You denied")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share as report/ })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items[0]).toContain("Command");
    expect(items[1]).toContain("Your answer");
    expect(items[2]).toContain("File");
  });
});

describe("sessions list", () => {
  const device = (tool: Record<string, unknown>) => ({
    hostId: "h1",
    hostname: "DevMachine",
    os: "linux",
    status: "APPROVED",
    online: true,
    lastSeenAt: null,
    tools: [
      {
        toolId: "host.claude-code",
        name: "Claude Code",
        version: null,
        path: null,
        protected: false,
        protectMode: "none",
        desiredProtection: true,
        changes: [],
        supportedModes: ["hook", "gateway"],
        enforcement: "observed-only",
        ...tool,
      },
    ],
  });
  afterEach(() => {
    state.sessions = [];
    state.devices = [];
    state.hasNextPage = false;
  });

  it("says why it is empty when a tool is not protected, instead of implying nothing happened", () => {
    state.devices = [device({})];
    ui(<SessionsView />);
    expect(
      screen.getByText(
        /Claude Code isn't protected on DevMachine yet, so its commands don't show here/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Commands show here only for AI tools Manar protects/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open AI tools" })).toHaveAttribute(
      "href",
      "/ai-tools",
    );
  });

  it("asks the owner to turn it on when the switch is off, and says nothing for a protected tool", () => {
    state.devices = [device({ desiredProtection: false })];
    ui(<SessionsView />);
    expect(screen.getByText(/Turn it on in AI tools/)).toBeInTheDocument();
    cleanup();
    state.devices = [device({ protected: true, protectMode: "hook" })];
    ui(<SessionsView />);
    expect(screen.queryByText(/isn't protected/)).not.toBeInTheDocument();
  });

  it("counts secret files and tool calls, and pages back past 200", () => {
    const fetchNextPage = vi.fn();
    state.fetchNextPage = fetchNextPage;
    state.hasNextPage = true;
    state.sessions = [
      {
        id: "s1",
        hostId: "h1",
        hostname: "DevMachine",
        toolId: "host.claude-code",
        toolName: "Claude Code",
        source: "gap",
        startedAt: "2026-11-02T20:00:00Z",
        endedAt: "2026-11-02T20:30:00Z",
        counts: { commands: 0, files: 0, sites: 0, tools: 0, approvals: 0, secrets: 3, blocked: 0 },
        stepCount: 3,
      },
    ];
    ui(<SessionsView />);
    expect(screen.getByText(/3 secret files/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show older sessions" }));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
