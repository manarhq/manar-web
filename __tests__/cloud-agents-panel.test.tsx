import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import enCloud from "@/messages/en/cloudAgents.json";
import arCloud from "@/messages/ar/cloudAgents.json";
import enPlanLimit from "@/messages/en/planLimit.json";
import arPlanLimit from "@/messages/ar/planLimit.json";
import { CloudAgentsPanel } from "@/components/manar/personal/cloud-agents/cloud-agents-panel";
import { agentSlug, standingTask } from "@/lib/personal/cloud-providers";

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));
import { apiClient } from "@/lib/api/client";

const GET = vi.mocked(apiClient.GET);
const POST = vi.mocked(apiClient.POST);

const agent = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  slug: "claude-1",
  displayName: "My Claude",
  status: "ACTIVE",
  paused: false,
  platform: "COPILOT_STUDIO",
  mcpUrl: "https://mcp.example.com/mcp/me/claude-1",
  pendingClientId: null,
  oauthClientId: "manar-cloud-x",
  ...over,
});
const list = (items: unknown[], max: number | null, chatGptAvailable = true) => ({
  data: { limit: { max, used: items.length }, chatGptAvailable, items },
});

function show(locale: "en" | "ar" = "en") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={locale}
        messages={
          locale === "en"
            ? { cloudAgents: enCloud, planLimit: enPlanLimit }
            : { cloudAgents: arCloud, planLimit: arPlanLimit }
        }
      >
        <CloudAgentsPanel />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
});

describe("CloudAgentsPanel", () => {
  it("shows the plan limit notice instead of the form when the limit is reached", async () => {
    GET.mockResolvedValue(list([agent()], 1) as never);
    show();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upgrade" })).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("shows a paused agent as paused, not deleted, with its address still listed", async () => {
    GET.mockResolvedValue(list([agent({ paused: true })], 1) as never);
    show();
    expect(await screen.findByText(/Paused: over your plan's limit/)).toBeTruthy();
    expect(screen.getByDisplayValue("https://mcp.example.com/mcp/me/claude-1")).toBeTruthy();
  });

  it("connects Claude with its callback URLs and the three steps, and shows the secret once", async () => {
    GET.mockResolvedValue(list([], 1) as never);
    POST.mockResolvedValue({
      data: {
        agent: { id: "a2", slug: "x" },
        platform: "COPILOT_STUDIO",
        mcpUrl: "https://mcp.example.com/mcp/me/x",
        authorizationUrl: "a",
        tokenUrl: "t",
        refreshUrl: "r",
        scopes: ["s"],
        clientId: "manar-cloud-x",
        clientSecret: "shh",
      },
    } as never);
    show();
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "My Claude" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("Shown once. Copy it now.")).toBeTruthy();
    const [url, init] = POST.mock.calls[0] as unknown as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(url).toBe("/cloud-agents");
    expect(init.body).toMatchObject({
      platform: "COPILOT_STUDIO",
      displayName: "My Claude",
      redirectUris: expect.arrayContaining(["https://claude.ai/api/mcp/auth_callback"]),
    });
    expect(screen.getByDisplayValue("shh")).toBeTruthy();
  });

  it("keeps ChatGPT off when the service says it is not available", async () => {
    GET.mockResolvedValue(list([], 5, false) as never);
    show();
    fireEvent.click(await screen.findByRole("tab", { name: "ChatGPT" }));
    expect(await screen.findByText(/ChatGPT is not available on this service yet/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "GPT" } });
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
  });

  it("renders in Arabic", async () => {
    GET.mockResolvedValue(list([], 5) as never);
    show("ar");
    expect(await screen.findByRole("button", { name: "ربط" })).toBeTruthy();
  });
});

describe("cloud provider helpers", () => {
  it("makes a valid slug and a 90 day task", () => {
    expect(agentSlug("My  Claude!!", () => 0)).toBe("my-claude-000");
    expect(agentSlug("***", () => 0)).toBe("agent-000");
    expect(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(agentSlug("ChatGPT (work)"))).toBe(true);
    expect(standingTask("A", 0).expiresAt).toBe("1970-04-01T00:00:00.000Z");
  });
});
