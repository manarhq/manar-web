import { setRequestLocale } from "next-intl/server";

import { SecretsPage } from "@/components/manar/personal/secrets-page";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/secrets">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SecretsPage />;
}
