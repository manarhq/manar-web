import { setRequestLocale } from "next-intl/server";

import { AgentDetailView } from "@/components/manar/agents/agent-detail-view";
import type { AppLocale } from "@/i18n/routing";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";

export default async function AgentsDetailPage({ params }: PageProps<"/[locale]/agents/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  const me = await getMe();
  return <AgentDetailView agentId={id} canManageQuarantine={isRoleManager(me?.roles ?? [])} />;
}
