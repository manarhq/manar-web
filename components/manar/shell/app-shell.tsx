import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { getSession } from "@/lib/auth/session.server";
import { resolveWorkspaceKind, usesPersonalShell } from "@/lib/workspace-kind";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/manar/sidebar";
import { Topbar } from "@/components/manar/topbar";
import { GrowthBanners } from "@/components/manar/growth/growth-banners";
import { LicenseBanner } from "@/components/manar/license-banner";
import { PersonalSidebar } from "@/components/manar/personal/personal-sidebar";
import { PersonalTopbar } from "@/components/manar/personal/personal-topbar";
import { TelemetryBoot } from "@/components/manar/privacy/telemetry-boot";
import { ApprovalChime } from "@/components/manar/approvals/approval-chime";
import { ApprovalsLiveSync } from "@/components/manar/approvals/approvals-live-sync";
import { TutorialProvider } from "@/components/manar/tutorial/tutorial-provider";
import type { AppLocale } from "@/i18n/routing";
import { canReadLiveFeed, isRoleManager } from "@/lib/roles";
import { getMe } from "@/lib/auth/me.server";

/**
 * The authenticated shell, chosen by the workspace type: the personal shell for PERSONAL and
 * SAMPLE workspaces, the operations console for COMPANY. Both route groups, (app) and
 * (personal), render through this so one URL always gets the right chrome for its workspace.
 *
 * `proxy.ts` already redirects unauthenticated requests before they reach here; the
 * `getSession()` call is defense-in-depth and the source of the tenant/user context.
 */
export async function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // No active workspace yet (still being set up, or none): wait on the setup screen.
  if (!session.workspaceId) {
    redirect({ href: "/setup", locale });
    return null;
  }

  // Roles come from manar-api for the active workspace, never from the session or token.
  const me = await getMe();
  const roles = me?.roles ?? [];
  // The live feed refuses other roles, so only these subscribe; everyone else polls.
  const liveSync = canReadLiveFeed(roles) ? <ApprovalsLiveSync /> : null;

  if (usesPersonalShell(resolveWorkspaceKind(session))) {
    return (
      <div className="flex h-screen overflow-hidden">
        <ApprovalChime />
        {liveSync}
        <TelemetryBoot />
        <PersonalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PersonalTopbar
            displayName={session.displayName}
            email={session.email}
            workspaceId={session.workspaceId}
          />
          <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 empty:hidden">
              {/* The owner of a personal workspace always sees spend-safety alerts. */}
              <GrowthBanners billing />
            </div>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <TutorialProvider scope={session.workspaceId} userId={session.subject} roles={roles}>
      <div className="flex h-screen overflow-hidden">
        <ApprovalChime />
        {liveSync}
        <TelemetryBoot />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            workspaceName={me?.workspace.name ?? ""}
            workspaceId={session.workspaceId}
            displayName={session.displayName}
            email={session.email}
          />
          <LicenseBanner isAdmin={isRoleManager(roles)} />
          <main id="main-content" className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 empty:hidden">
              <GrowthBanners billing={isRoleManager(roles)} />
            </div>
            {children}
          </main>
        </div>
      </div>
    </TutorialProvider>
  );
}
