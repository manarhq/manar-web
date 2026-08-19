import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/manar/page-header";
import { OverviewLiveTiles } from "@/components/manar/overview-live-tiles";
import type { AppLocale } from "@/i18n/routing";

export default async function OverviewPage({ params }: PageProps<"/[locale]/overview">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("overview");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <OverviewLiveTiles />
    </div>
  );
}
