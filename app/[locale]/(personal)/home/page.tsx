import { setRequestLocale } from "next-intl/server";

import { PersonalHome } from "@/components/manar/personal/personal-home";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <PersonalHome />;
}
