import { setRequestLocale } from "next-intl/server";

import { SessionsView } from "@/components/manar/insight/sessions-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/sessions">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SessionsView />;
}
