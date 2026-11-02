import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { HostsView } from "@/components/manar/hosts/hosts-view";
import { getMe } from "@/lib/auth/me.server";
import { getSession } from "@/lib/auth/session.server";
import { resolveWorkspaceKind, usesPersonalShell } from "@/lib/workspace-kind";
import type { AppLocale } from "@/i18n/routing";

/** manar-api: reads need TENANT_OWNER, SECURITY_ADMIN or AUDITOR; writes the first two. */
const READ_ROLES = ["TENANT_OWNER", "SECURITY_ADMIN", "AUDITOR"];

export default async function HostsPage({ params }: PageProps<"/[locale]/hosts">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  // The personal nav calls this page Devices; the heading follows the nav.
  const personal = usesPersonalShell(resolveWorkspaceKind(await getSession()));
  const title = personal ? (await getTranslations("personal.nav"))("devices") : undefined;

  const me = await getMe();
  if (!me || !me.roles.some((role) => READ_ROLES.includes(role))) {
    const t = await getTranslations("hosts");
    return <AccessDeniedPanel title={title ?? t("title")} body={t("accessDeniedBody")} />;
  }

  return <HostsView roles={me.roles} title={title} />;
}
