import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntegrationsView } from "@/components/manar/integrations/integrations-view";
import { SsoSettingsView } from "@/components/manar/settings/sso-settings-view";
import { isDemoFixture } from "@/components/manar/demo-fixture-badge";
import aiSystemsAr from "@/messages/ar/aiSystems.json";
import aiSystemsEn from "@/messages/en/aiSystems.json";
import commonEn from "@/messages/en/common.json";
import integrationsEn from "@/messages/en/integrations.json";
import settingsEn from "@/messages/en/settings.json";
import toolsEn from "@/messages/en/tools.json";

/**
 * GATE-0 S65, S27, D5 and the DataOrigin rule: labels must not claim more
 * than the platform knows. `enabled` is a flag, not a health probe; a
 * GOVERNED coverage result is not proof that everything is enforced; an
 * SSO page must not invite a federation setup that does not exist; and
 * fixture data must never be presented as live.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const tools = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-tools", () => ({ useAllToolsForPicker: tools }));

vi.mock("@/hooks/use-tenant-settings", () => ({
  useTenantSettings: () => ({
    isPending: false,
    isError: false,
    data: {
      sso: {
        realm: "acme",
        issuerUrl: "http://kc.test/realms/acme",
        clientId: "manar-web",
        authorizationEndpoint: "http://kc.test/auth",
        tokenEndpoint: "http://kc.test/token",
        endSessionEndpoint: "http://kc.test/logout",
        jwksUri: "http://kc.test/certs",
      },
    },
  }),
}));

function tool(overrides: Record<string, unknown>) {
  return {
    id: "t1",
    name: "Microsoft Graph",
    type: "IAM",
    vendor: "Microsoft",
    description: null,
    protocol: "MICROSOFT",
    enabled: true,
    actions: [],
    ...overrides,
  };
}

function renderEn(node: ReactNode) {
  render(
    <NextIntlClientProvider
      locale="en"
      messages={{
        common: commonEn,
        integrations: integrationsEn,
        tools: toolsEn,
        settings: settingsEn,
      }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  tools.mockReset();
});

describe("integrations (S65)", () => {
  it("says enabled, not connected, and does not paint enabled as healthy", () => {
    tools.mockReturnValue({ isPending: false, isError: false, data: [tool({})] });
    renderEn(<IntegrationsView />);

    expect(document.body.textContent).not.toMatch(/connected/i);
    const badge = screen.getByText(toolsEn.status.enabled).closest("[data-slot=status-badge]");
    expect(badge?.getAttribute("data-status-tone")).not.toBe("positive");
    expect(document.body.textContent).toContain("does not check whether a connector is reachable");
  });

  it("badges a DEMO FIXTURE tool and leaves others alone", () => {
    tools.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        tool({
          id: "fx",
          name: "Graph (fixture)",
          description:
            "Microsoft Graph connector pointed at the local DEMO FIXTURE, not a live tenant.",
        }),
        tool({ id: "real", name: "Graph (tenant)", description: "Customer tenant" }),
      ],
    });
    renderEn(<IntegrationsView />);

    expect(screen.getAllByText(toolsEn.demoFixture.label)).toHaveLength(1);
  });
});

describe("isDemoFixture", () => {
  it("reads metadata.dataOrigin and the description marker", () => {
    expect(isDemoFixture({ metadata: { dataOrigin: "DEMO_FIXTURE" }, description: null })).toBe(
      true,
    );
    expect(isDemoFixture({ description: "DEMO FIXTURE: incident 4201" })).toBe(true);
    expect(isDemoFixture({ metadata: { dataOrigin: "LIVE" }, description: "Live tenant" })).toBe(
      false,
    );
  });
});

describe("GOVERNED coverage copy (S27)", () => {
  it("does not claim Manar enforces the whole system", () => {
    expect(aiSystemsEn.coverage.GOVERNED.meaning).not.toMatch(/enforces/i);
    expect(aiSystemsEn.coverage.GOVERNED.meaning).toMatch(/does not show/i);
    expect(aiSystemsAr.coverage.GOVERNED.meaning).not.toContain("يفرض الضوابط على هذا النظام");
  });
});

describe("SSO settings (D5)", () => {
  it("fences federation as not available and offers no admin-console link", () => {
    renderEn(<SsoSettingsView />);

    expect(screen.getByText(settingsEn.sso.federationUnavailableTitle)).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.body.textContent).not.toMatch(/admin console/i);
  });
});
