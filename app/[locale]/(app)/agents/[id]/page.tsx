import { setRequestLocale } from "next-intl/server";

import { AgentDetailView } from "@/components/manar/agents/agent-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function AgentsDetailPage({ params }: PageProps<"/[locale]/agents/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <AgentDetailView agentId={id} />;
}
