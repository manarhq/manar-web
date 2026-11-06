import { setRequestLocale } from "next-intl/server";

import { FrictionView } from "@/components/manar/friction/friction-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/friction">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <FrictionView />;
}
