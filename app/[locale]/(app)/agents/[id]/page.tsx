import { setRequestLocale } from "next-intl/server";

import { AgentDetailView } from "@/components/manar/agents/agent-detail-view";
import type { AppLocale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/session.server";
import { isRoleManager } from "@/lib/roles";

export default async function AgentsDetailPage({ params }: PageProps<"/[locale]/agents/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  return <AgentDetailView agentId={id} canManageQuarantine={isRoleManager(session?.roles ?? [])} />;
}
