import { setRequestLocale } from "next-intl/server";

import { AiSystemsListView } from "@/components/manar/ai-systems/ai-systems-list-view";
import { canManageAiSystems } from "@/components/manar/ai-systems/access";
import { getMe } from "@/lib/auth/me.server";
import type { AppLocale } from "@/i18n/routing";

/**
 * Reads on `/ai-systems` are open to any authenticated tenant user, so
 * this page is never gated behind `AccessDeniedPanel` — unlike
 * `/settings/*`, whose endpoints are role-gated for reads too. What the
 * session's roles decide here is whether the *write* affordances render
 * at all, so a reader is not offered buttons manar-api's `RolesGuard`
 * would 403.
 */
export default async function AiSystemsPage({ params }: PageProps<"/[locale]/ai-systems">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const me = await getMe();
  return <AiSystemsListView canManage={canManageAiSystems(me?.roles ?? [])} />;
}
