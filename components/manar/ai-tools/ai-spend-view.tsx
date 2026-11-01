"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CoinsIcon } from "@phosphor-icons/react/ssr";

import { useAiSpend, useSaveSpendSettings } from "@/hooks/use-ai-spend";
import { parseUsd, toolLabel, type AiSpend, type SpendPeriod } from "@/lib/personal/ai-spend";
import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function PeriodTable({ title, period }: { title: string; period: SpendPeriod }) {
  const t = useTranslations("personal.aiSpend");
  const f = useFormatter();
  const usd = (n: number) => f.number(n, { style: "currency", currency: "USD" });
  return (
    <section className="grid content-start gap-2 rounded-xl border border-border bg-card p-4">
      <h2 className="flex flex-wrap items-baseline justify-between gap-2 text-base font-medium">
        {title}
        <span className="text-lg tabular-nums">{usd(period.totalUsd)}</span>
      </h2>
      {period.rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{t("noUsage")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tool")}</TableHead>
              <TableHead>{t("model")}</TableHead>
              <TableHead className="text-end">{t("tokens")}</TableHead>
              <TableHead className="text-end">{t("cost")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {period.rows.map((r) => (
              <TableRow key={`${r.toolId}|${r.provider}|${r.model}`}>
                <TableCell mono>{toolLabel(r.toolId)}</TableCell>
                <TableCell mono>{r.model}</TableCell>
                <TableCell mono className="text-end">
                  {f.number(r.inputTokens + r.outputTokens)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {r.priced ? usd(r.costUsd) : t("unpriced")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function SettingsForm({ data }: { data: AiSpend }) {
  const t = useTranslations("personal.aiSpend");
  const save = useSaveSpendSettings();
  const [budget, setBudget] = useState(data.settings.monthlyBudgetUsd?.toString() ?? "");
  const [cap, setCap] = useState(data.settings.monthlyCapUsd?.toString() ?? "");
  const [block, setBlock] = useState(data.settings.secretsMode === "block");
  const [together, setTogether] = useState(data.settings.capScope === "workspace");
  const b = parseUsd(budget);
  const c = parseUsd(cap);
  return (
    <form
      className="grid content-start gap-4 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!b.ok || !c.ok) return;
        save.mutate({
          monthlyBudgetUsd: b.value,
          monthlyCapUsd: c.value,
          secretsMode: block ? "block" : "mask",
          capScope: together ? "workspace" : "owner",
        });
      }}
    >
      <h2 className="text-base font-medium">{t("settingsTitle")}</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="spend-budget">{t("budget")}</Label>
        <Input
          id="spend-budget"
          inputMode="decimal"
          value={budget}
          aria-invalid={!b.ok}
          onChange={(e) => setBudget(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("budgetHint")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="spend-cap">{t("cap")}</Label>
        <Input
          id="spend-cap"
          inputMode="decimal"
          value={cap}
          aria-invalid={!c.ok}
          onChange={(e) => setCap(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("capHint")}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div>
          <Label htmlFor="spend-together">{t("capTogether")}</Label>
          <p className="text-xs text-muted-foreground">{t("capTogetherHint")}</p>
        </div>
        <Switch id="spend-together" checked={together} onCheckedChange={setTogether} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div>
          <Label htmlFor="spend-block">{t("blockSecrets")}</Label>
          <p className="text-xs text-muted-foreground">{t("blockSecretsHint")}</p>
        </div>
        <Switch id="spend-block" checked={block} onCheckedChange={setBlock} />
      </div>
      {(!b.ok || !c.ok) && (
        <p role="alert" className="text-xs text-deny">
          {t("invalidAmount")}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-xs text-deny">
          {t("saveFailed")}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("saved")}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={save.isPending || !b.ok || !c.ok}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

/**
 * AI spend: what DOOR counted from your AI tools' model calls, per tool and model, this week and
 * this month. Amounts are list-price estimates, not invoices. A budget raises an alert; a cap
 * pauses the tool until next month or until you raise it.
 */
export function AiSpendView() {
  const t = useTranslations("personal.aiSpend");
  const { data, isLoading, isError } = useAiSpend();
  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {isLoading ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError || !data ? (
        <p role="alert" className="text-sm text-deny">
          {t("unavailable")}
        </p>
      ) : (
        <>
          {data.budget.state === "warning" || data.budget.state === "over" ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-wait-soft p-3 text-sm text-foreground"
            >
              {data.budget.state === "over"
                ? t("budgetOver", { pct: Math.round(data.budget.usedPct ?? 0) })
                : t("budgetNear", { pct: Math.round(data.budget.usedPct ?? 0) })}
            </p>
          ) : null}
          {data.paused.length > 0 ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-deny-soft p-3 text-sm text-foreground"
            >
              {t("pausedTools", { tools: data.paused.map(toolLabel).join(", ") })}
            </p>
          ) : null}
          {data.week.rows.length === 0 && data.month.rows.length === 0 ? (
            <EmptyState icon={CoinsIcon} title={t("emptyTitle")} description={t("empty")} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <PeriodTable title={t("week")} period={data.week} />
              <PeriodTable title={t("month")} period={data.month} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("estimate")}</p>
          <SettingsForm data={data} />
        </>
      )}
    </div>
  );
}
