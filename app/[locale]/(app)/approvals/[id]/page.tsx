import { setRequestLocale } from "next-intl/server";

import { ApprovalDetailView } from "@/components/manar/approvals/approval-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function ApprovalsDetailPage({
  params,
}: PageProps<"/[locale]/approvals/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <ApprovalDetailView approvalId={id} />;
}
