import { setRequestLocale } from "next-intl/server";

import { SampleEntry } from "@/components/manar/features/sample-entry";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/sample">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SampleEntry />;
}
