import { setRequestLocale } from "next-intl/server";

import { AgentsListView } from "@/components/manar/agents/agents-list-view";
import type { AppLocale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/session.server";
import { isRoleManager } from "@/lib/roles";

export default async function AgentsPage({ params }: PageProps<"/[locale]/agents">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  return <AgentsListView canViewQuarantine={isRoleManager(session?.roles ?? [])} />;
}
