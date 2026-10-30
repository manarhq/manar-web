import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { getSession } from "@/lib/auth/session.server";
import { resolveWorkspaceKind, usesPersonalShell } from "@/lib/workspace-kind";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/manar/sidebar";
import { Topbar } from "@/components/manar/topbar";
import { LicenseBanner } from "@/components/manar/license-banner";
import { PersonalSidebar } from "@/components/manar/personal/personal-sidebar";
import { PersonalTopbar } from "@/components/manar/personal/personal-topbar";
import { TutorialProvider } from "@/components/manar/tutorial/tutorial-provider";
import type { AppLocale } from "@/i18n/routing";
import { isRoleManager } from "@/lib/roles";

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

  if (usesPersonalShell(resolveWorkspaceKind(session))) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PersonalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PersonalTopbar displayName={session.displayName} email={session.email} />
          <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <TutorialProvider scope={session.tenantSlug} userId={session.subject} roles={session.roles}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            tenantSlug={session.tenantSlug}
            displayName={session.displayName}
            email={session.email}
          />
          <LicenseBanner isAdmin={isRoleManager(session.roles)} />
          <main id="main-content" className="flex-1 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </TutorialProvider>
  );
}
