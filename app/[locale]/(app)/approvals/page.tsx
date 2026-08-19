import { setRequestLocale } from "next-intl/server";

import { ApprovalsListView } from "@/components/manar/approvals/approvals-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function ApprovalsPage({ params }: PageProps<"/[locale]/approvals">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <ApprovalsListView />;
}
