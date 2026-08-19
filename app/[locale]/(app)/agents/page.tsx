import { setRequestLocale } from "next-intl/server";

import { AgentsListView } from "@/components/manar/agents/agents-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function AgentsPage({ params }: PageProps<"/[locale]/agents">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <AgentsListView />;
}
