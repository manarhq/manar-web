import { setRequestLocale } from "next-intl/server";

import { AiSystemDetailView } from "@/components/manar/ai-systems/ai-system-detail-view";
import { canManageAiSystems } from "@/components/manar/ai-systems/access";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

export default async function AiSystemDetailPage({
  params,
}: PageProps<"/[locale]/ai-systems/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  return (
    <AiSystemDetailView aiSystemId={id} canManage={canManageAiSystems(session?.roles ?? [])} />
  );
}
