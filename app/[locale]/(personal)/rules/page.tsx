import { getTranslations, setRequestLocale } from "next-intl/server";

import { RuleDraftDialog } from "@/components/manar/features/rule-draft-dialog";
import { StartModeSwitcher } from "@/components/manar/features/start-mode-switcher";
import { PageHeader } from "@/components/manar/page-header";
import { PoliciesListView } from "@/components/manar/policies/policies-list-view";
import type { AppLocale } from "@/i18n/routing";
import { parseRuleDraft } from "@/lib/personal/rule-draft";

export default async function Page({ params, searchParams }: PageProps<"/[locale]/rules">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("features.rules");
  const { draft } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />
      <StartModeSwitcher />
      <p className="text-xs text-muted-foreground">{t("gitHelp")}</p>
      <section aria-label={t("yourRules")}>
        <PoliciesListView />
      </section>
      <RuleDraftDialog draft={parseRuleDraft(draft)} />
    </div>
  );
}
