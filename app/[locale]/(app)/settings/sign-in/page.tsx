import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { getSignInMethods } from "@/lib/auth/linked-accounts.server";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

/**
 * Settings, Sign-in methods: which ways of signing in belong to this account, and how to add
 * another. Linking is the only way two methods ever become one account, and it only happens here,
 * while signed in (POST /api/auth/link). Never by matching an email address.
 */
export default async function SignInMethodsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/settings/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("signIn");
  const search = await searchParams;
  const failed = search.error === "linkFailed";

  const session = await getSession();
  const methods = session ? await getSignInMethods(session) : null;

  const rows = [
    { id: "microsoft" as const, linked: methods?.microsoft ?? false, detail: null },
    { id: "github" as const, linked: methods?.github ?? false, detail: null },
    { id: "email" as const, linked: methods?.email != null, detail: methods?.email ?? null },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {failed && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("errors.linkFailed")}
        </p>
      )}
      {!methods && <p className="text-sm text-muted-foreground">{t("unavailable")}</p>}
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-foreground">{t(row.id)}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {row.linked && <CheckCircleIcon className="size-3.5" aria-hidden />}
                {row.linked ? t("connected") : t("notConnected")}
                {row.detail && <bdi className="truncate"> {row.detail}</bdi>}
              </span>
            </div>
            {methods && (row.id === "email" || !row.linked) && (
              <form method="POST" action="/api/auth/link">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="method" value={row.id} />
                <Button type="submit" variant="outline" size="sm">
                  {row.id === "email" ? t("linkEmail") : t("link")}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
