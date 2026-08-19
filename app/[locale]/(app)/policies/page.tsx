import { setRequestLocale } from "next-intl/server";

import { PoliciesListView } from "@/components/manar/policies/policies-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function PoliciesPage({ params }: PageProps<"/[locale]/policies">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <PoliciesListView />;
}
