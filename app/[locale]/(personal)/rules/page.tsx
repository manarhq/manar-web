import { getTranslations, setRequestLocale } from "next-intl/server";

import { StartModeSwitcher } from "@/components/manar/features/start-mode-switcher";
import { PageHeader } from "@/components/manar/page-header";
import { PoliciesListView } from "@/components/manar/policies/policies-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/rules">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("features.rules");
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />
      <StartModeSwitcher />
      <section aria-label={t("yourRules")}>
        <PoliciesListView />
      </section>
    </div>
  );
}
