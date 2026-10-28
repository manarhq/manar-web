import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { HostsView } from "@/components/manar/hosts/hosts-view";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

/** manar-api: reads need TENANT_OWNER, SECURITY_ADMIN or AUDITOR; writes the first two. */
const READ_ROLES = ["TENANT_OWNER", "SECURITY_ADMIN", "AUDITOR"];

export default async function HostsPage({ params }: PageProps<"/[locale]/hosts">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  if (!session || !session.roles.some((role) => READ_ROLES.includes(role))) {
    const t = await getTranslations("hosts");
    return <AccessDeniedPanel title={t("title")} body={t("accessDeniedBody")} />;
  }

  return <HostsView roles={session.roles} />;
}
