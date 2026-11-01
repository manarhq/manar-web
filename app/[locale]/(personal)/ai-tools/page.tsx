import { setRequestLocale } from "next-intl/server";

import { AiToolsView } from "@/components/manar/ai-tools/ai-tools-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/ai-tools">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <AiToolsView />;
}
