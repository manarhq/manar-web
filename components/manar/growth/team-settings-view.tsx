"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { PageHeader } from "@/components/manar/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAutoJoin,
  useCreateInvite,
  useInvites,
  useRevokeInvite,
  useSetAutoJoin,
  type InviteCreated,
} from "@/hooks/use-growth";

const ROLES = ["DEVELOPER", "APPROVER", "AUDITOR", "READ_ONLY", "SECURITY_ADMIN"] as const;

function errorKey(error: unknown): string {
  const m = (error as { message?: string } | undefined)?.message;
  return m && /^(team_plan_required|workspace_read_only|company_workspace_required)$/.test(m)
    ? m
    : "generic";
}

function InviteCard() {
  const t = useTranslations("growth.team");
  const format = useFormatter();
  const invites = useInvites();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const id = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("DEVELOPER");
  const [last, setLast] = useState<InviteCreated | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invite.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { email, role },
              {
                onSuccess: (r) => {
                  setLast(r);
                  setEmail("");
                },
              },
            );
          }}
        >
          <div className="flex min-w-56 flex-1 flex-col gap-1">
            <Label htmlFor={`${id}-e`}>{t("invite.email")}</Label>
            <Input
              id={`${id}-e`}
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-r`}>{t("invite.role")}</Label>
            <select
              id={`${id}-r`}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.currentTarget.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`invite.roles.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {t("invite.send")}
          </Button>
        </form>
        {create.isError && (
          <Alert role="alert">
            <AlertDescription>{t(`errors.${errorKey(create.error)}` as never)}</AlertDescription>
          </Alert>
        )}
        {last && (
          <Alert>
            <AlertDescription>
              {last.emailed ? (
                t("invite.sent", { email: last.email })
              ) : (
                <>
                  {t("invite.notEmailed")}{" "}
                  <code dir="ltr" className="break-all text-xs">
                    {last.link}
                  </code>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        <h2 className="text-sm font-medium">{t("invite.open")}</h2>
        {invites.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : invites.data?.items.length ? (
          <ul className="flex flex-col gap-2">
            {invites.data.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span dir="ltr">{i.email}</span> · {t(`invite.roles.${i.role}` as never)} ·{" "}
                  <span className="text-muted-foreground">
                    {t("invite.expires", {
                      date: format.dateTime(new Date(i.expiresAt), { dateStyle: "medium" }),
                    })}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(i.id)}
                >
                  {t("invite.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("invite.none")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AutoJoinCard() {
  const t = useTranslations("growth.team.autoJoin");
  const q = useAutoJoin();
  const set = useSetAutoJoin();
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {q.isPending ? (
          <Skeleton className="h-8 w-full" />
        ) : q.data?.available ? (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id={id}
                checked={q.data.enabled}
                disabled={set.isPending}
                onCheckedChange={(v) => set.mutate({ enabled: v })}
              />
              <Label htmlFor={id}>{t("toggle")}</Label>
            </div>
            <div className="flex flex-col gap-1 sm:max-w-xs">
              <Label htmlFor={`${id}-cap`}>{t("seatCap")}</Label>
              <Input
                id={`${id}-cap`}
                type="number"
                min={1}
                max={10000}
                dir="ltr"
                defaultValue={q.data.seatCap}
                onBlur={(e) => {
                  const n = Number(e.currentTarget.value);
                  if (Number.isInteger(n) && n >= 1 && n !== q.data.seatCap)
                    set.mutate({ enabled: q.data.enabled, seatCap: n });
                }}
              />
              <span className="text-xs text-muted-foreground">{t("seatCapHelp")}</span>
            </div>
            {set.isError && (
              <Alert role="alert">
                <AlertDescription>{t("ownerOnly")}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** `/settings/team`: email invites and Microsoft auto-join (company workspaces). */
export function TeamSettingsView() {
  const t = useTranslations("growth.team");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <InviteCard />
      <AutoJoinCard />
    </div>
  );
}
