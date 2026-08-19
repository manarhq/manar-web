import { setRequestLocale } from "next-intl/server";

import { RolesView } from "@/components/manar/roles/roles-view";
import type { AppLocale } from "@/i18n/routing";

export default async function RolesPage({ params }: PageProps<"/[locale]/roles">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <RolesView />;
}
