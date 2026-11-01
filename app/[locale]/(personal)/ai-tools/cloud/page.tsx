import { getTranslations, setRequestLocale } from "next-intl/server";

import { CloudAgentsPanel } from "@/components/manar/personal/cloud-agents/cloud-agents-panel";
import { PageHeader } from "@/components/manar/page-header";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/ai-tools/cloud">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("cloudAgents");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("intro")} />
      <CloudAgentsPanel />
    </div>
  );
}
