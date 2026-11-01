import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/manar/login-form";
import type { AppLocale } from "@/i18n/routing";

const KNOWN_ERROR_KEYS = new Set(["callbackFailed", "sessionExpired", "unavailable"]);

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("auth");
  const search = await searchParams;
  const errorParam =
    typeof search.error === "string" && KNOWN_ERROR_KEYS.has(search.error)
      ? search.error
      : undefined;
  const signedOut = search.notice === "signedOut";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-mono text-xs text-muted-foreground">Manar</span>
        <h1 className="text-xl font-semibold text-foreground">{t("loginTitle")}</h1>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      {signedOut && !errorParam && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("signedOutNotice")}
        </p>
      )}

      <LoginForm
        errorKey={errorParam as "callbackFailed" | "sessionExpired" | "unavailable" | undefined}
      />
    </div>
  );
}
