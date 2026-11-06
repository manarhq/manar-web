import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/manar/shell/app-shell";

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => undefined }));
vi.mock("@/lib/auth/session.server", () => ({
  getSession: () => Promise.resolve(session.current),
}));
vi.mock("@/lib/auth/me.server", () => ({
  getMe: () => Promise.resolve({ roles: ["TENANT_OWNER"], workspace: { name: "W" } }),
}));
vi.mock("@/lib/workspace-kind", () => ({
  resolveWorkspaceKind: (s: { workspaceKind?: string }) => s.workspaceKind ?? "COMPANY",
  usesPersonalShell: (k: string) => k === "PERSONAL" || k === "SAMPLE",
}));
vi.mock("@/i18n/navigation", () => ({ redirect: () => undefined }));
vi.mock("@/components/manar/ai-default-notice", () => ({
  AiDefaultNotice: ({ isAdmin }: { isAdmin: boolean }) => (
    <div data-testid="ai-notice" data-admin={String(isAdmin)} />
  ),
}));
// Chrome that is not under test.
vi.mock("@/components/manar/sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/components/manar/topbar", () => ({ Topbar: () => null }));
vi.mock("@/components/manar/growth/growth-banners", () => ({ GrowthBanners: () => null }));
vi.mock("@/components/manar/license-banner", () => ({ LicenseBanner: () => null }));
vi.mock("@/components/manar/personal/personal-sidebar", () => ({ PersonalSidebar: () => null }));
vi.mock("@/components/manar/personal/personal-topbar", () => ({ PersonalTopbar: () => null }));
vi.mock("@/components/manar/privacy/telemetry-boot", () => ({ TelemetryBoot: () => null }));
vi.mock("@/components/manar/approvals/approval-chime", () => ({ ApprovalChime: () => null }));
vi.mock("@/components/manar/tutorial/tutorial-provider", () => ({
  TutorialProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/manar/policies/policy-job-notifier", () => ({
  PolicyJobNotifier: () => null,
}));
vi.mock("server-only", () => ({}));
afterEach(cleanup);

describe("AI default notice placement", () => {
  it.each([
    ["PERSONAL", "personal shell"],
    ["COMPANY", "company shell"],
  ])("renders in the %s workspace's %s for an owner", async (kind) => {
    session.current = {
      workspaceId: "w1",
      workspaceKind: kind,
      subject: "u",
      displayName: "U",
      email: "u@example.test",
    };
    render(await AppShell({ locale: "en", children: <p>page</p> }));
    expect(screen.getByTestId("ai-notice").getAttribute("data-admin")).toBe("true");
  });
});
