import {
  DesktopIcon,
  DownloadSimpleIcon,
  ProhibitIcon,
  BuildingsIcon,
} from "@phosphor-icons/react/ssr";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { AppealForm } from "@/components/manar/suspended/appeal-form";
import { Card, CardContent } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getRestriction, RESTRICTION_CATEGORIES } from "@/lib/auth/restriction.server";
import { getSession } from "@/lib/auth/session.server";
import { env } from "@/lib/env";

/** Cloudflare's documented always-pass test site key, outside production only. */
const TEST_SITE_KEY = "1x00000000000000000000AA";

/**
 * What a suspended or banned person sees (DESK spec 9.2, 9.4; mockups 05g, 05h): the kind, the
 * reason category, the end time, what still works, and the appeal. Never the internal note.
 */
export default async function SuspendedPage({ params }: PageProps<"/[locale]/suspended">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("suspended");
  const format = await getFormatter();
  const r = await getRestriction();
  const when = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Dubai",
    });

  if (!r?.restricted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">{r ? t("clear.title") : t("unknown.title")}</h1>
        <p className="text-muted-foreground">{r ? t("clear.body") : t("unknown.body")}</p>
        <Link href="/" className="underline underline-offset-4">
          {t("clear.back")}
        </Link>
      </main>
    );
  }

  const category = (RESTRICTION_CATEGORIES as readonly string[]).includes(r.category)
    ? r.category
    : "other_policy";
  const banned = r.kind === "BAN";
  const siteKey = env.TURNSTILE_SITE_KEY ?? (env.NODE_ENV === "production" ? "" : TEST_SITE_KEY);
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1
          className="flex items-center gap-2 text-2xl font-semibold"
          data-testid="suspended-title"
        >
          <ProhibitIcon className="size-6 text-destructive" aria-hidden />
          {banned ? t("banned.title") : t("suspended.title")}
        </h1>
        <p className="text-muted-foreground">
          {banned
            ? t("banned.body")
            : r.until
              ? t.rich("suspended.body", {
                  until: when(r.until),
                  b: (c) => <b className="text-foreground">{c}</b>,
                })
              : t("suspended.bodyNoEnd")}
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t("reason")}</dt>
                <dd data-testid="suspended-category">{t(`category.${category}.title`)}</dd>
                <dt className="text-muted-foreground">{t("means")}</dt>
                <dd>{t(`category.${category}.body`)}</dd>
                {r.until && !banned && (
                  <>
                    <dt className="text-muted-foreground">{t("until")}</dt>
                    <dd>{when(r.until)}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3 text-sm">
              <h2 className="text-base font-semibold">{t("works.title")}</h2>
              <p className="flex gap-2">
                <DesktopIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t("works.devices")}
              </p>
              <p className="flex gap-2">
                <DownloadSimpleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {t("works.data")}{" "}
                  <a
                    href="/api/bff/account/export"
                    download
                    className="underline underline-offset-4"
                  >
                    {t("works.download")}
                  </a>
                </span>
              </p>
              <p className="flex gap-2">
                <BuildingsIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t("works.companies")}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent>
            <AppealForm
              siteKey={siteKey}
              availableAt={r.appealAvailableAt}
              appeal={
                r.appeal
                  ? { code: r.appeal.code, status: r.appeal.status, dueAt: when(r.appeal.dueAt) }
                  : null
              }
              nextAt={when(r.appealAvailableAt)}
            />
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        {t.rich("questions", {
          mail: (c) => (
            <a href="mailto:support@fixio.ae" className="underline underline-offset-4">
              {c}
            </a>
          ),
        })}
      </p>
    </main>
  );
}
