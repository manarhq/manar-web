"use client";

import { useLocale, useTranslations } from "next-intl";

import { PRIVACY_POLICY_URL } from "@/components/manar/privacy/privacy-settings-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useDataPreferences, useSetDataPreferences } from "@/hooks/use-data-preferences";

/** One-time, non-blocking notice after first sign-in. Dismissal is stored by manar-api. */
export function DataNotice() {
  const t = useTranslations("privacy.notice");
  const locale = useLocale();
  const { data } = useDataPreferences();
  const set = useSetDataPreferences();
  if (!data || data.noticeDismissed) return null;
  return (
    <Alert>
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>{t("body")}</span>
        <a
          href={PRIVACY_POLICY_URL(locale)}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("policy")}
        </a>
        <Link href="/settings/privacy" className="underline">
          {t("settings")}
        </Link>
        <Button
          size="sm"
          variant="outline"
          disabled={set.isPending}
          onClick={() => set.mutate({ noticeDismissed: true })}
        >
          {t("dismiss")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
