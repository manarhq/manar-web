import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { BillingView } from "@/components/manar/billing/billing-view";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

/** Plan and billing, in both shells (the shell is chosen by workspace type, not by route). */
export default async function BillingPage({ params }: PageProps<"/[locale]/settings/billing">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const me = await getMe();
  if (!me || !isRoleManager(me.roles)) {
    const t = await getTranslations("billing");
    return <AccessDeniedPanel title={t("title")} body={t("loadError")} />;
  }
  return <BillingView />;
}
