import { setRequestLocale } from "next-intl/server";

import { ApprovalDetailView } from "@/components/manar/approvals/approval-detail-view";
import type { AppLocale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/session.server";

export default async function ApprovalsDetailPage({
  params,
}: PageProps<"/[locale]/approvals/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  return <ApprovalDetailView approvalId={id} viewerSubject={session?.subject} />;
}
