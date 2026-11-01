import { setRequestLocale } from "next-intl/server";

import { AgentsListView } from "@/components/manar/agents/agents-list-view";
import type { AppLocale } from "@/i18n/routing";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";

export default async function AgentsPage({ params }: PageProps<"/[locale]/agents">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const me = await getMe();
  return <AgentsListView canViewQuarantine={isRoleManager(me?.roles ?? [])} />;
}
