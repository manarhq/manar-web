import { setRequestLocale } from "next-intl/server";

import { ApprovalsView } from "@/components/manar/approvals/approvals-view";
import type { AppLocale } from "@/i18n/routing";

export default async function ApprovalsPage({ params }: PageProps<"/[locale]/approvals">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <ApprovalsView />;
}
