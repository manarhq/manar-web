import { setRequestLocale } from "next-intl/server";

import { ToolDetailView } from "@/components/manar/tools/tool-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function ToolsDetailPage({ params }: PageProps<"/[locale]/tools/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <ToolDetailView toolId={id} />;
}
