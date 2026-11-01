import { getTranslations, setRequestLocale } from "next-intl/server";

import { SetupWorkspace } from "@/components/manar/setup-workspace";
import { getSession } from "@/lib/auth/session.server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/** "Setting up your workspace": shown after sign-in while the workspace is queued or being created. */
export default async function SetupPage({ params }: PageProps<"/[locale]/setup">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  // Already has a workspace: nothing to wait for.
  if (session?.workspaceId) redirect({ href: "/", locale });
  const t = await getTranslations("workspace");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <span className="font-mono text-xs text-muted-foreground">Manar</span>
      <SetupWorkspace
        labels={{
          title: t("setup.title"),
          body: t("setup.body"),
          none: t("setup.none"),
          failed: t("setup.failed"),
          signOut: t("setup.signOut"),
        }}
      />
    </div>
  );
}
