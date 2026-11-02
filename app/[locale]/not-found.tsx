import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/** The localized 404, rendered in the locale layout (which reads the request, so its scripts get the nonce). */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-2 px-4 py-24">
      <h1 className="text-lg font-medium">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {t("home")}
      </Link>
    </main>
  );
}
