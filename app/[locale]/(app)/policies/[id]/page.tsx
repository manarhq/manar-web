import { setRequestLocale } from "next-intl/server";

import { PolicyDetailView } from "@/components/manar/policies/policy-detail-view";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

export default async function PoliciesDetailPage({ params }: PageProps<"/[locale]/policies/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  return <PolicyDetailView policyId={id} roles={session?.roles ?? []} />;
}
