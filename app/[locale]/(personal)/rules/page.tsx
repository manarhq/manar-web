import { getTranslations, setRequestLocale } from "next-intl/server";

import { AllowGrantsList } from "@/components/manar/features/allow-grants-list";
import { LearningSummary } from "@/components/manar/features/learning-summary";
import { RuleDraftDialog } from "@/components/manar/features/rule-draft-dialog";
import { StartModeSwitcher } from "@/components/manar/features/start-mode-switcher";
import { PageHeader } from "@/components/manar/page-header";
import { PoliciesListView } from "@/components/manar/policies/policies-list-view";
import type { AppLocale } from "@/i18n/routing";
import { getMe } from "@/lib/auth/me.server";
import { parseRuleDraft } from "@/lib/personal/rule-draft";
import { canChangeLearning } from "@/lib/roles";

export default async function Page({ params, searchParams }: PageProps<"/[locale]/rules">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("features.rules");
  const { draft, draftRef } = await searchParams;
  const me = await getMe();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />
      <StartModeSwitcher />
      <p className="text-xs text-muted-foreground">{t("gitHelp")}</p>
      <section aria-label={t("yourRules")}>
        <PoliciesListView />
      </section>
      <LearningSummary canChange={canChangeLearning(me?.roles ?? [])} />
      <AllowGrantsList />
      <RuleDraftDialog
        draft={parseRuleDraft(draft)}
        draftRef={typeof draftRef === "string" ? draftRef : undefined}
      />
    </div>
  );
}
