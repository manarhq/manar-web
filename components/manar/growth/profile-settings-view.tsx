"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { ContactEmailForm } from "@/components/manar/growth/contact-email-form";
import { PageHeader } from "@/components/manar/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useBadge,
  useContactEmail,
  useEmailPrefs,
  useSetBadge,
  useSetEmailPrefs,
} from "@/hooks/use-growth";

function BadgeCard() {
  const t = useTranslations("growth.profile");
  const badge = useBadge();
  const set = useSetBadge();
  const [copied, setCopied] = useState(false);
  const id = useId();
  const on = badge.data?.enabled === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("badge.title")}</CardTitle>
        <CardDescription>{t("badge.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {badge.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : badge.isError ? (
          <Alert role="alert">
            <AlertDescription>{t("loadError")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id={id}
                checked={on}
                disabled={set.isPending}
                onCheckedChange={(v) => set.mutate(v)}
              />
              <Label htmlFor={id}>{t("badge.toggle")}</Label>
            </div>
            {set.isError && (
              <Alert role="alert">
                <AlertDescription>{t("saveError")}</AlertDescription>
              </Alert>
            )}
            {badge.data?.enabled ? (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t("badge.preview")}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a remote SVG badge, not an optimisable image */}
                  <img
                    src={badge.data.badgeUrl}
                    alt="Protected by Manar"
                    height={22}
                    className="h-[22px] w-fit"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${id}-md`}>{t("badge.snippet")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${id}-md`}
                      readOnly
                      dir="ltr"
                      value={badge.data.markdown}
                      className="font-mono text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          (badge.data as { markdown: string }).markdown,
                        );
                        setCopied(true);
                      }}
                    >
                      {copied ? (
                        <CheckIcon className="size-4" aria-hidden />
                      ) : (
                        <CopyIcon className="size-4" aria-hidden />
                      )}
                      {copied ? t("badge.copied") : t("badge.copy")}
                    </Button>
                  </div>
                  <a
                    href={badge.data.profileUrl}
                    className="text-sm text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("badge.open")}
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("badge.off")}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmailCard() {
  const t = useTranslations("growth.profile");
  const prefs = useEmailPrefs();
  const set = useSetEmailPrefs();
  const id = useId();
  const zones =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("email.title")}</CardTitle>
        <CardDescription>{t("email.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {prefs.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : prefs.isError ? (
          <Alert role="alert">
            <AlertDescription>{t("loadError")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id={id}
                checked={prefs.data.weeklyDigest}
                disabled={set.isPending}
                onCheckedChange={(v) => set.mutate({ weeklyDigest: v })}
              />
              <Label htmlFor={id}>{t("email.toggle")}</Label>
            </div>
            <div className="flex flex-col gap-1 sm:max-w-sm">
              <Label htmlFor={`${id}-tz`}>{t("email.timezone")}</Label>
              <Input
                id={`${id}-tz`}
                dir="ltr"
                list={`${id}-zones`}
                defaultValue={prefs.data.timezone}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== prefs.data.timezone) set.mutate({ timezone: v });
                }}
              />
              <datalist id={`${id}-zones`}>
                {zones.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1 sm:max-w-sm">
              <Label htmlFor={`${id}-lang`}>{t("email.language")}</Label>
              <select
                id={`${id}-lang`}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={prefs.data.locale}
                onChange={(e) => set.mutate({ locale: e.currentTarget.value as "en" | "ar" })}
              >
                <option value="en">{t("email.en")}</option>
                <option value="ar">{t("email.ar")}</option>
              </select>
            </div>
            {set.isError && (
              <Alert role="alert">
                <AlertDescription>{t("saveError")}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  const t = useTranslations("growth.contact");
  const q = useContactEmail();
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {q.isPending ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <>
            <p className="text-sm">
              {q.data?.email ? (
                <span dir="ltr">{q.data.email}</span>
              ) : (
                <span className="text-muted-foreground">{t("none")}</span>
              )}
            </p>
            {editing || !q.data?.email ? (
              <ContactEmailForm onDone={() => setEditing(false)} />
            ) : (
              <div>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  {t("change")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** `/settings/profile`: the public badge and the weekly email. */
export function ProfileSettingsView() {
  const t = useTranslations("growth.profile");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <ContactCard />
      <BadgeCard />
      <EmailCard />
    </div>
  );
}
