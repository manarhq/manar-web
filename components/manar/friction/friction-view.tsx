"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { FrictionChart } from "@/components/manar/friction/friction-chart";
import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFriction } from "@/hooks/use-friction";
import { BffError } from "@/lib/api/raw";
import { cleanAgentText } from "@/lib/approvals/safe-text";

const RANGES = [7, 14, 30] as const;

/**
 * How much Manar asked (decision 38): the trend, and the same numbers as a table. An approver sees
 * the workspace and each person; anyone else sees only their own devices. Counts and times only.
 */
export function FrictionView() {
  const t = useTranslations("features.friction");
  const format = useFormatter();
  const [days, setDays] = useState<number>(14);
  const q = useFriction(days);
  const r = q.data;

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} />
      <p className="max-w-prose text-sm text-muted-foreground">
        {r?.scope === "workspace" ? t("introWorkspace") : t("introMe")}
      </p>
      <div role="group" aria-label={t("range")} className="flex gap-2">
        {RANGES.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={d === days ? "secondary" : "outline"}
            aria-pressed={d === days}
            onClick={() => setDays(d)}
          >
            {t("lastDays", { days: d })}
          </Button>
        ))}
      </div>

      {q.isLoading && <Skeleton className="h-40 w-full" aria-busy />}
      {q.isError &&
        (q.error instanceof BffError && q.error.status === 404 ? (
          <p role="note" className="text-sm text-muted-foreground">
            {t("notAvailable")}
          </p>
        ) : q.error instanceof BffError && q.error.status === 403 ? (
          <p role="note" className="text-sm text-muted-foreground">
            {t("noAccess")}
          </p>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {t("loadFailed")}
          </p>
        ))}
      {r && (
        <>
          <section aria-labelledby="friction-summary" className="grid gap-1">
            <h2 id="friction-summary" className="text-base font-medium">
              {t("summaryTitle")}
            </h2>
            <p className="text-sm">
              {t("average", {
                avg: format.number(r.avgPromptsPerDeveloperPerDay),
                budget: r.budget,
              })}{" "}
              <span
                className={r.overBudget ? "font-medium text-orange-text" : "text-muted-foreground"}
              >
                {r.overBudget ? t("over") : t("within")}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("totals", {
                prompts: r.totals.prompts,
                approvals: r.totals.approvals,
                denies: r.totals.denies,
                later: r.totals.deniedLaterApproved,
                expired: r.totals.expired,
                seconds: format.number(r.totals.avgAnswerSeconds),
                minutes: format.number(r.totals.blockedMinutes),
              })}
            </p>
          </section>

          <FrictionChart
            series={r.series}
            budget={r.budget}
            label={t("chartLabel", {
              days: r.days,
              prompts: r.totals.prompts,
              avg: format.number(r.avgPromptsPerDeveloperPerDay),
            })}
            budgetLabel={t("budgetLine", { budget: r.budget })}
          />

          <details open className="grid gap-2">
            <summary className="cursor-pointer text-sm font-medium">{t("tableTitle")}</summary>
            <Table>
              <caption className="sr-only">{t("tableCaption")}</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t("day")}</TableHead>
                  <TableHead scope="col">{t("prompts")}</TableHead>
                  <TableHead scope="col">{t("approvals")}</TableHead>
                  <TableHead scope="col">{t("denies")}</TableHead>
                  <TableHead scope="col">{t("expired")}</TableHead>
                  <TableHead scope="col">{t("later")}</TableHead>
                  <TableHead scope="col">{t("answer")}</TableHead>
                  <TableHead scope="col">{t("blocked")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.series.map((s) => (
                  <TableRow key={s.day}>
                    <TableCell>
                      <time dateTime={s.day}>
                        {format.dateTime(new Date(`${s.day}T00:00:00Z`), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                      </time>
                    </TableCell>
                    <TableCell mono>{s.prompts}</TableCell>
                    <TableCell mono>{s.approvals}</TableCell>
                    <TableCell mono>{s.denies}</TableCell>
                    <TableCell mono>{s.expired}</TableCell>
                    <TableCell mono>{s.deniedLaterApproved}</TableCell>
                    <TableCell mono>{format.number(s.avgAnswerSeconds)}</TableCell>
                    <TableCell mono>{format.number(s.blockedMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>

          {r.people && r.people.length > 0 && (
            <section aria-labelledby="friction-people" className="grid gap-2">
              <h2 id="friction-people" className="text-base font-medium">
                {t("peopleTitle")}
              </h2>
              <Table>
                <caption className="sr-only">{t("peopleCaption")}</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("person")}</TableHead>
                    <TableHead scope="col">{t("prompts")}</TableHead>
                    <TableHead scope="col">{t("approvals")}</TableHead>
                    <TableHead scope="col">{t("denies")}</TableHead>
                    <TableHead scope="col">{t("later")}</TableHead>
                    <TableHead scope="col">{t("answer")}</TableHead>
                    <TableHead scope="col">{t("blocked")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.people.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <bdi>{p.name ? cleanAgentText(p.name, 60).text : t("unassigned")}</bdi>
                        {p.me && <span className="text-muted-foreground"> {t("you")}</span>}
                      </TableCell>
                      <TableCell mono>{p.prompts}</TableCell>
                      <TableCell mono>{p.approvals}</TableCell>
                      <TableCell mono>{p.denies}</TableCell>
                      <TableCell mono>{p.expired}</TableCell>
                      <TableCell mono>{p.deniedLaterApproved}</TableCell>
                      <TableCell mono>{format.number(p.avgAnswerSeconds)}</TableCell>
                      <TableCell mono>{format.number(p.blockedMinutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
