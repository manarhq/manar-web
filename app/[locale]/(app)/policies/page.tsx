import { setRequestLocale } from "next-intl/server";

import { AllowGrantsList } from "@/components/manar/features/allow-grants-list";
import { LearningSummary } from "@/components/manar/features/learning-summary";
import { PoliciesListView } from "@/components/manar/policies/policies-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function PoliciesPage({ params }: PageProps<"/[locale]/policies">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return (
    <div className="flex flex-col gap-8">
      <PoliciesListView />
      <LearningSummary />
      <AllowGrantsList />
    </div>
  );
}
