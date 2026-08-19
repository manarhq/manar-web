import { setRequestLocale } from "next-intl/server";

import { PolicyDetailView } from "@/components/manar/policies/policy-detail-view";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

export default async function PoliciesDetailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/policies/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  // `?version=<id>` (set by SuggestPolicyDialog after a successful AI
  // draft) preselects that version in the "Version content" viewer below,
  // so the newly-created DRAFT is what the operator lands on for review —
  // not left to notice it only as a row in the versions table.
  const sp = await searchParams;
  const rawVersion = sp?.version;
  const initialVersionId = typeof rawVersion === "string" ? rawVersion : undefined;
  return (
    <PolicyDetailView
      policyId={id}
      roles={session?.roles ?? []}
      initialVersionId={initialVersionId}
    />
  );
}
