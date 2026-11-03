import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiToolsView } from "@/components/manar/ai-tools/ai-tools-view";
import { coverageOf, modeKey, type AiToolRow, type AiToolsDevice } from "@/lib/personal/ai-tools";
import aiSystemsEn from "@/messages/en/aiSystems.json";
import aiSystemsAr from "@/messages/ar/aiSystems.json";
import commonEn from "@/messages/en/common.json";
import errorsEn from "@/messages/en/errors.json";
import hostsAr from "@/messages/ar/hosts.json";
import hostsEn from "@/messages/en/hosts.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const state = vi.hoisted(() => ({ data: undefined as unknown, mutate: vi.fn() }));
vi.mock("@/hooks/use-ai-tools", () => ({
  useAiTools: () => ({ data: state.data, isLoading: false, isError: false }),
  useSetProtection: () => ({ mutate: state.mutate, isPending: false, isError: false }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const tool = (over: Partial<AiToolRow>): AiToolRow => ({
  toolId: "host.cursor",
  name: "Cursor",
  version: "2.1.0",
  path: "/opt/Cursor",
  protected: true,
  protectMode: "hook",
  desiredProtection: true,
  changes: ["/home/sam/.cursor/hooks.json (edited; the original is backed up)"],
  supportedModes: ["hook", "mcp"],
  enforcement: "governed",
  ...over,
});
const device = (tools: AiToolRow[], over: Partial<AiToolsDevice> = {}): AiToolsDevice => ({
  hostId: "h1",
  hostname: "sam-laptop",
  os: "linux",
  status: "APPROVED",
  online: true,
  lastSeenAt: null,
  tools,
  ...over,
});

function ui(node: ReactElement, locale = "en") {
  const ar = locale === "ar";
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={{
        personal: ar ? personalAr : personalEn,
        hosts: ar ? hostsAr : hostsEn,
        aiSystems: ar ? aiSystemsAr : aiSystemsEn,
        common: commonEn,
        errors: errorsEn,
      }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => state.mutate.mockReset());
afterEach(cleanup);

describe("AI tools page", () => {
  it("marks a tampered device, and always says what personal mode cannot stop", () => {
    state.data = [
      device(
        [tool({ toolId: "host.claude-code", name: "Claude Code", enforcement: "observed-only" })],
        {
          tamper: {
            at: new Date().toISOString(),
            kind: "protect.tamper.settings_flag",
            toolId: "host.claude-code",
            maskedPath: null,
          },
        },
      ),
      device([tool({})], { hostId: "h2", hostname: "other" }),
    ];
    ui(<AiToolsView />);
    expect(screen.getAllByText("Tampered")).toHaveLength(1);
    expect(screen.getByText(/started with --settings/)).toBeInTheDocument();
    expect(screen.getByText(personalEn.aiTools.limits)).toBeInTheDocument();
  });

  it("shows each tool with its version, mode and the label the API gave it", () => {
    state.data = [
      device([
        tool({}),
        tool({
          toolId: "host.chatgpt-desktop",
          name: "ChatGPT desktop",
          version: null,
          protected: false,
          protectMode: "none",
          supportedModes: [],
          enforcement: "observed-only",
          changes: [],
        }),
      ]),
    ];
    ui(<AiToolsView />);
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("version 2.1.0")).toBeInTheDocument();
    expect(screen.getByText("version unknown")).toBeInTheDocument();
    expect(screen.getByText("Hook")).toBeInTheDocument();
    expect(screen.getByText(aiSystemsEn.coverage.GOVERNED.label)).toBeInTheDocument();
    expect(screen.getAllByText(aiSystemsEn.coverage.OBSERVED_ONLY.label).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Manar can see this tool but cannot gate its actions."),
    ).toBeInTheDocument();
  });

  it("the Protect switch of a tool that can only be seen is off and disabled", () => {
    state.data = [
      device([
        tool({
          toolId: "host.chatgpt-desktop",
          name: "ChatGPT desktop",
          protected: false,
          protectMode: "none",
          supportedModes: [],
          enforcement: "observed-only",
        }),
      ]),
    ];
    ui(<AiToolsView />);
    const sw = screen.getByRole("switch", { name: "Protect ChatGPT desktop on sam-laptop" });
    expect(sw).toHaveAttribute("data-disabled");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("turning the switch off asks the API to unprotect that tool on that device", () => {
    state.data = [device([tool({})])];
    ui(<AiToolsView />);
    fireEvent.click(screen.getByRole("switch", { name: "Protect Cursor on sam-laptop" }));
    expect(state.mutate).toHaveBeenCalledWith({
      hostId: "h1",
      toolId: "host.cursor",
      protect: false,
    });
  });

  it("lists what Manar changed and links to cloud agents", () => {
    state.data = [device([tool({})])];
    ui(<AiToolsView />);
    expect(screen.getByText("What Manar changed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect a cloud agent" })).toHaveAttribute(
      "href",
      "/ai-tools/cloud",
    );
  });

  it("a pending device cannot be switched yet", () => {
    state.data = [
      device([tool({ protected: false, protectMode: "none", enforcement: "observed-only" })], {
        status: "PENDING",
      }),
    ];
    ui(<AiToolsView />);
    expect(screen.getByRole("switch")).toHaveAttribute("data-disabled");
    expect(screen.getByText("Protection starts once you approve this device.")).toBeInTheDocument();
  });

  it("renders in Arabic", () => {
    state.data = [device([tool({})])];
    ui(<AiToolsView />, "ar");
    expect(screen.getByText("ما غيّره منار")).toBeInTheDocument();
    expect(screen.getByText("ربط مباشر")).toBeInTheDocument();
  });
});

describe("labels stay honest", () => {
  it("an unknown label reads as observed-only, and nothing installed reads as observed only", () => {
    expect(coverageOf("governed")).toBe("GOVERNED");
    expect(coverageOf("something new")).toBe("OBSERVED_ONLY");
    expect(coverageOf("monitoring unavailable")).toBe("MONITORING_UNAVAILABLE");
    expect(modeKey({ protected: false, protectMode: "hook" })).toBe("observed");
    expect(modeKey({ protected: true, protectMode: "none" })).toBe("observed");
    expect(modeKey({ protected: true, protectMode: "mcp" })).toBe("mcp");
  });
});
