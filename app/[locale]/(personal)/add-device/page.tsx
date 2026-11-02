import { getTranslations, setRequestLocale } from "next-intl/server";

import { AddDeviceView } from "@/components/manar/add-device/add-device-view";
import { PageHeader } from "@/components/manar/page-header";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/add-device">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("addDevice");
  // Only a Tenant Owner or Security Admin may approve a PENDING device (manar-api decides).
  const me = await getMe();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <AddDeviceView canApprove={!!me && isRoleManager(me.roles)} />
    </div>
  );
}
