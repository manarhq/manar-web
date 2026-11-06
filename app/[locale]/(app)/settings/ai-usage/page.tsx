import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { AiUsageView } from "@/components/manar/ai-usage/ai-usage-view";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

/** The workspace's own AI usage per day. Owners and security admins, like Billing (same numbers). */
export default async function AiUsagePage({ params }: PageProps<"/[locale]/settings/ai-usage">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const me = await getMe();
  if (!me || !isRoleManager(me.roles)) {
    const t = await getTranslations("aiUsage");
    return <AccessDeniedPanel title={t("title")} body={t("loadError")} />;
  }
  return <AiUsageView />;
}
