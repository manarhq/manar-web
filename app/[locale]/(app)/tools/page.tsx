import { setRequestLocale } from "next-intl/server";

import { ToolsListView } from "@/components/manar/tools/tools-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function ToolsPage({ params }: PageProps<"/[locale]/tools">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <ToolsListView />;
}
