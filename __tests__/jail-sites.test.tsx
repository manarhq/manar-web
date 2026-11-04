import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SitesView } from "@/components/manar/jail/sites-view";
import { jailToolsOf, toolName, type SiteRule } from "@/lib/personal/site-rules";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";
import commonEn from "@/messages/en/common.json";

const state = vi.hoisted(() => ({
  rules: [] as unknown[],
  devices: [] as unknown[],
  add: vi.fn(),
  remove: vi.fn(),
  error: false,
}));
const search = vi.hoisted(() => ({ current: null as URLSearchParams | null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => search.current }));

vi.mock("@/hooks/use-site-rules", () => ({
  useSiteRules: () => ({ data: state.rules, isLoading: false, isError: state.error }),
  useAddSiteRule: () => ({ mutate: state.add, isPending: false, isError: false }),
  useRemoveSiteRule: () => ({ mutate: state.remove, isPending: false, isError: false }),
}));
vi.mock("@/hooks/use-ai-tools", () => ({
  useAiTools: () => ({ data: state.devices }),
}));

const rule = (over: Partial<SiteRule>): SiteRule => ({
  id: "r1",
  hostId: "h1",
  hostname: "sam-laptop",
  toolId: "host.claude-code",
  site: "example.org",
  mode: "ALLOW",
  expiresAt: null,
  source: "approval",
  createdBy: "u1",
  createdAt: "2026-11-01T10:00:00Z",
  ...over,
});

function ui(locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={{ personal: locale === "ar" ? personalAr : personalEn, common: commonEn }}
    >
      <SitesView />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  state.add.mockReset();
  state.remove.mockReset();
  state.error = false;
  state.rules = [];
  state.devices = [
    {
      hostId: "h1",
      hostname: "sam-laptop",
      os: "linux",
      status: "APPROVED",
      online: true,
      lastSeenAt: null,
      tools: [
        { toolId: "host.claude-code", name: "Claude Code" },
        { toolId: "host.cursor", name: "Cursor" },
      ],
    },
  ];
});
afterEach(cleanup);

describe("JAIL sites page", () => {
  it("states what is always allowed and what is not filtered yet", () => {
    ui();
    expect(screen.getByText(/package registries/)).toBeInTheDocument();
    expect(screen.getByText(/commands it runs are not filtered on Windows/)).toBeInTheDocument();
    expect(screen.getByText(/No answers saved yet/)).toBeInTheDocument();
  });

  it("lists each saved answer with its tool, device, time limit and who set it", () => {
    state.rules = [
      rule({}),
      rule({ id: "r2", site: "*.bad.example", mode: "DENY", source: "console" }),
      rule({ id: "r3", site: "temp.example", expiresAt: "2026-11-01T18:00:00Z" }),
    ];
    ui();
    expect(screen.getByText("example.org")).toBeInTheDocument();
    const list = within(screen.getByRole("list"));
    expect(list.getAllByText("Allowed")).toHaveLength(2);
    expect(list.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText(/added here/)).toBeInTheDocument();
    expect(screen.getByText(/until/)).toBeInTheDocument();
    expect(screen.getAllByText(/Claude Code · sam-laptop/)).toHaveLength(3);
  });

  it("Remove deletes that rule", () => {
    state.rules = [rule({})];
    ui();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove example.org for Claude Code on sam-laptop" }),
    );
    expect(state.remove).toHaveBeenCalledWith("r1");
  });

  it("Add sends the device, a filtered tool, the site and the answer", () => {
    ui();
    // only tools JAIL filters are offered
    expect(screen.queryByRole("option", { name: "Cursor" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Site"), { target: { value: "  api.example.com " } });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "DENY" } });
    fireEvent.change(screen.getByLabelText("For"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(state.add.mock.calls[0]![0]).toEqual({
      hostId: "h1",
      toolId: "host.claude-code",
      site: "api.example.com",
      mode: "DENY",
      hours: 8,
    });
  });

  it('"Make a rule" from a site approval opens the form filled in; the person still adds it', () => {
    search.current = new URLSearchParams({
      site: "example.org",
      host: "h1",
      tool: "host.claude-code",
    });
    try {
      ui();
      expect(screen.getByLabelText("Site")).toHaveValue("example.org");
      expect(state.add).not.toHaveBeenCalled();
    } finally {
      search.current = null;
    }
  });

  it("without a device that has a filtered tool it says so instead of showing a form", () => {
    state.devices = [];
    ui();
    expect(screen.getByText("Add a device with a supported tool first.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });

  it("does not claim an empty list when the API failed", () => {
    state.error = true;
    ui();
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your sites.");
  });

  it("renders in Arabic with the site kept left-to-right", () => {
    state.rules = [rule({})];
    ui("ar");
    expect(screen.getByText("المواقع التي تصل إليها أدوات الذكاء الاصطناعي")).toBeInTheDocument();
    expect(screen.getByLabelText("الموقع")).toHaveAttribute("dir", "ltr");
  });
});

describe("site rule helpers and messages", () => {
  it("names the tools and finds the filtered ones", () => {
    expect(toolName("host.codex-cli")).toBe("Codex CLI");
    expect(toolName("host.other")).toBe("other");
    expect(
      jailToolsOf([{ toolId: "host.cursor" }, { toolId: "host.gemini-cli" }]).map((t) => t.id),
    ).toEqual(["host.gemini-cli"]);
  });

  it("English and Arabic have the same keys", () => {
    const keys = (o: unknown, p = ""): string[] =>
      o && typeof o === "object"
        ? Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k))
        : [p];
    expect(keys(personalAr).sort()).toEqual(keys(personalEn).sort());
  });
});
