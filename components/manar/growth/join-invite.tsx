"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useAcceptInvite } from "@/hooks/use-growth";

/** `/join?invite=<token>`: the person presses Accept (nothing happens on load, so a link preview or a wrong click cannot join). */
export function JoinInvite() {
  const t = useTranslations("growth.join");
  const token = useSearchParams().get("invite");
  const accept = useAcceptInvite();
  const code = (accept.error as { message?: string } | null)?.message ?? "generic";
  const known = ["invite_invalid", "invite_unavailable", "invite_email_mismatch"].includes(code);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      {!token ? (
        <Alert role="alert">
          <AlertDescription>{t("missing")}</AlertDescription>
        </Alert>
      ) : accept.isSuccess ? (
        <>
          <Alert role="status">
            <AlertDescription>{t("done")}</AlertDescription>
          </Alert>
          <Link href="/home">
            <Button>{t("open")}</Button>
          </Link>
        </>
      ) : (
        <>
          {accept.isError ? (
            <Alert role="alert">
              <AlertDescription>
                {t(`errors.${known ? code : "generic"}` as never)}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">{t("confirm")}</p>
          )}
          {code === "invite_email_mismatch" && accept.isError ? (
            <Link href="/settings/profile" className="text-sm underline">
              {t("verifyEmail")}
            </Link>
          ) : null}
          {!(accept.isError && code !== "invite_email_mismatch") && (
            <div>
              <Button disabled={accept.isPending} onClick={() => accept.mutate(token)}>
                {t("accept")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
