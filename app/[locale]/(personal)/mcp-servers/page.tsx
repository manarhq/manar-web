import { setRequestLocale } from "next-intl/server";

import { McpServersView } from "@/components/manar/insight/mcp-servers-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/mcp-servers">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <McpServersView />;
}
