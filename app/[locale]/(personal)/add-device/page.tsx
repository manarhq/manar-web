import { getTranslations, setRequestLocale } from "next-intl/server";

import { AddDeviceView } from "@/components/manar/add-device/add-device-view";
import { PageHeader } from "@/components/manar/page-header";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/add-device">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("addDevice");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <AddDeviceView />
    </div>
  );
}
