import { setRequestLocale } from "next-intl/server";

import { getSession } from "@/lib/auth/session.server";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/manar/sidebar";
import { Topbar } from "@/components/manar/topbar";
import { TutorialProvider } from "@/components/manar/tutorial/tutorial-provider";
import type { AppLocale } from "@/i18n/routing";

/**
 * The protected app shell (Section 60): sidebar + topbar around every
 * authenticated route. `proxy.ts` already redirects unauthenticated
 * requests before they reach here — this `getSession()` call is
 * defense-in-depth (never trust that a lower layer already checked) and,
 * more importantly, the source of the tenant/user context the Topbar
 * displays.
 */
export default async function AppShellLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
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
          <main id="main-content" className="flex-1 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </TutorialProvider>
  );
}
