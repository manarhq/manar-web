"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { startReauth } from "@/lib/auth/start-reauth";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { PageHeader } from "@/components/manar/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelDeletion, useDeletion, useRequestDeletion } from "@/hooks/use-growth";

/** `/settings/account`: export first, then a graced deletion that can be cancelled. */
export function AccountSettingsView() {
  const t = useTranslations("growth.account");
  const format = useFormatter();
  const status = useDeletion();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const code = (request.error as { code?: string } | null)?.code;
  const blocked = code === "transfer_ownership_first";
  // Deleting needs a sign-in from the last five minutes: go through the identity provider again.

  const reauth = () => startReauth(locale, "/settings/account");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("export.title")}</CardTitle>
          <CardDescription>{t("export.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A plain link: the BFF streams the zip and the browser saves it. */}
          <a
            href="/api/bff/account/export"
            download
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-subtle"
          >
            <DownloadSimpleIcon className="size-4" aria-hidden />
            {t("export.button")}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("delete.title")}</CardTitle>
          <CardDescription>{t("delete.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {status.data && !status.data.scheduled && status.data.refused && (
            <Alert role="alert">
              <AlertDescription>{t("delete.refused")}</AlertDescription>
            </Alert>
          )}
          {status.isPending ? (
            <Skeleton className="h-9 w-48" />
          ) : status.isError ? (
            <Alert role="alert">
              <AlertDescription>{t("loadError")}</AlertDescription>
            </Alert>
          ) : status.data.scheduled ? (
            <>
              <Alert role="status">
                <AlertDescription>
                  {t("delete.scheduled", {
                    date: format.dateTime(new Date(status.data.executeAfter), {
                      dateStyle: "long",
                    }),
                  })}
                </AlertDescription>
              </Alert>
              <div>
                <Button
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                >
                  {t("delete.cancel")}
                </Button>
              </div>
            </>
          ) : open ? (
            <form
              className="flex flex-col gap-2 sm:max-w-sm"
              onSubmit={(e) => {
                e.preventDefault();
                request.mutate(undefined, {
                  onError: (err) => {
                    if ((err as { code?: string }).code === "reauth_required") reauth();
                  },
                });
              }}
            >
              <Label htmlFor={id}>{t("delete.confirmTitle")}</Label>
              <Input
                id={id}
                dir="ltr"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
              />
              <div>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={typed !== t("delete.confirmWord") || request.isPending}
                >
                  {t("delete.confirm")}
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <Button variant="destructive" onClick={() => setOpen(true)}>
                {t("delete.button")}
              </Button>
            </div>
          )}
          {request.isError && (
            <Alert role="alert">
              <AlertDescription>{blocked ? t("delete.blocked") : t("error")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
