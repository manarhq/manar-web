import type { ReactNode } from "react";
import { cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/app/providers";
import { CommandPalette } from "@/components/manar/command-palette";
import { useApprovalsList } from "@/hooks/use-approvals";
import { useIncidentsList } from "@/hooks/use-incidents";
import { AUDIT_VERIFY_INTERVAL_MS } from "@/hooks/use-audit-verify";
import commandPaletteEn from "@/messages/en/commandPalette.json";
import navEn from "@/messages/en/nav.json";

const GET = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ apiClient: { GET } }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const ROOT = join(__dirname, "..");
const src = (p: string) => readFileSync(join(ROOT, p), "utf8");

function wrap(client = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale="en"
        messages={{ commandPalette: commandPaletteEn, nav: navEn }}
      >
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

afterEach(() => {
  cleanup();
  GET.mockReset();
});

describe("command palette", () => {
  it("fires no list request until it is opened, then one per resource", async () => {
    GET.mockResolvedValue({ data: { items: [], nextCursor: null } });
    const Wrapper = wrap();
    render(<CommandPalette />, { wrapper: Wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(GET).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(5));
    expect(GET.mock.calls.map((c) => c[0]).sort()).toEqual([
      "/agents",
      "/incidents",
      "/policies",
      "/tasks",
      "/tools",
    ]);
  });
});

describe("refetch policy", () => {
  it("refetches on window focus nowhere by default, and tolerates 30 s of staleness", () => {
    const defaults = createQueryClient().getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.staleTime).toBe(30_000);
  });

  it("opts approvals and incidents back in", () => {
    GET.mockResolvedValue({ data: { items: [], nextCursor: null } });
    const client = createQueryClient();
    const wrapper = wrap(client);
    renderHook(
      () => {
        useApprovalsList();
        useIncidentsList();
      },
      { wrapper },
    );
    const opts = (key: string) =>
      client.getQueryCache().findAll({ queryKey: [key, "list"] })[0]?.options as
        { refetchOnWindowFocus?: boolean; staleTime?: number } | undefined;
    for (const key of ["approvals", "incidents"]) {
      expect(opts(key)?.refetchOnWindowFocus, key).toBe(true);
      expect(opts(key)?.staleTime, key).toBe(0);
    }
  });
});

describe("audit integrity badge", () => {
  it("checks every 5 minutes, not every 30 seconds", () => {
    expect(AUDIT_VERIFY_INTERVAL_MS).toBe(300_000);
  });

  for (const locale of ["en", "ar"]) {
    it(`${locale} has both strings for the badge hint`, () => {
      const m = JSON.parse(src(`messages/${locale}/overview.json`));
      expect(m.auditLastFullyVerified).toContain("{time}");
      expect(m.auditNotFullyVerified).toBeTruthy();
      expect(m.auditRecentOnly).toBeTruthy();
      expect(m.auditVerifiedSince).toContain("{time}");
    });
  }
});

describe("weight removed from the first load", () => {
  it("loads the assistant panel and tour practice lazily", () => {
    expect(src("components/manar/assistant/assistant-launcher.tsx")).not.toMatch(
      /^import .*from "\.\/assistant-panel"/m,
    );
    expect(src("components/manar/assistant/assistant-launcher.tsx")).toContain("dynamic(");
    expect(src("components/manar/tutorial/tutorial-provider.tsx")).not.toMatch(
      /^import .*from "\.\/practice"/m,
    );
  });

  it("drops cmdk, the unused command primitive and the create-next-app images", () => {
    expect(src("package.json")).not.toContain("cmdk");
    expect(existsSync(join(ROOT, "components/ui/command.tsx"))).toBe(false);
    for (const f of ["file", "globe", "next", "vercel", "window"])
      expect(existsSync(join(ROOT, `public/${f}.svg`))).toBe(false);
  });

  it("does not preload the monospace font", () => {
    expect(src("app/[locale]/layout.tsx")).toMatch(
      /JetBrains_Mono\(\{\s*(\/\/[^\n]*\n\s*)*preload: false/,
    );
  });
});
