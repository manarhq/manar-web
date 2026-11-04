"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ShieldCheckIcon } from "@phosphor-icons/react/ssr";

import { useAiTools } from "@/hooks/use-ai-tools";
import { useSearchParams } from "next/navigation";
import { useAddSiteRule, useRemoveSiteRule, useSiteRules } from "@/hooks/use-site-rules";
import { jailToolsOf, toolName, type SiteRule } from "@/lib/personal/site-rules";
import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const SELECT =
  "h-(--density-control-height) w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm";

function RuleRow({ rule }: { rule: SiteRule }) {
  const t = useTranslations("personal.sites");
  const format = useFormatter();
  const remove = useRemoveSiteRule();
  const tool = toolName(rule.toolId);
  return (
    <li className="grid gap-2 border-t border-border py-3 first:border-t-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" dir="auto">
          {rule.site}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tool} · {rule.hostname}
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={rule.mode === "ALLOW" ? "allow" : "deny"}>
          {rule.mode === "ALLOW" ? t("allow") : t("block")}
        </Badge>
        {rule.expiresAt
          ? t("until", {
              when: format.dateTime(new Date(rule.expiresAt), {
                dateStyle: "short",
                timeStyle: "short",
              }),
            })
          : t("always")}
        {" · "}
        {t(`source.${rule.source}`)}
      </p>
      <div className="flex flex-col items-start gap-1 md:items-end">
        <Button
          variant="outline"
          disabled={remove.isPending}
          aria-label={t("removeLabel", { site: rule.site, tool, device: rule.hostname })}
          onClick={() => remove.mutate(rule.id)}
        >
          {t("remove")}
        </Button>
        {remove.isError && (
          <p role="alert" className="text-xs text-deny">
            {t("removeFailed")}
          </p>
        )}
      </div>
    </li>
  );
}

function AddForm() {
  const t = useTranslations("personal.sites");
  const devices = useAiTools().data ?? [];
  const add = useAddSiteRule();
  const options = devices
    .filter((d) => d.status === "APPROVED")
    .map((d) => ({ device: d, tools: jailToolsOf(d.tools) }))
    .filter((o) => o.tools.length > 0);
  // "Make a rule" from a site approval (a personal owner never self-grants "always") opens this
  // form with the device, tool and site filled in; the person still saves it deliberately.
  const params = useSearchParams();
  const [hostId, setHostId] = useState(params?.get("host") ?? "");
  const [toolId, setToolId] = useState(params?.get("tool") ?? "");
  const [site, setSite] = useState(params?.get("site") ?? "");
  const [mode, setMode] = useState<"ALLOW" | "DENY">("ALLOW");
  const [hours, setHours] = useState("");

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("needDevice")}</p>;
  }
  const device = options.find((o) => o.device.hostId === hostId) ?? options[0]!;
  const tool = device.tools.find((x) => x.id === toolId) ?? device.tools[0]!;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!site.trim()) return;
    add.mutate(
      {
        hostId: device.device.hostId,
        toolId: tool.id,
        site: site.trim(),
        mode,
        hours: hours ? Number(hours) : undefined,
      },
      { onSuccess: () => setSite("") },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-sm">
        {t("deviceLabel")}
        <select
          className={SELECT}
          value={device.device.hostId}
          onChange={(e) => {
            setHostId(e.target.value);
            setToolId("");
          }}
        >
          {options.map((o) => (
            <option key={o.device.hostId} value={o.device.hostId}>
              {o.device.hostname}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("toolLabel")}
        <select className={SELECT} value={tool.id} onChange={(e) => setToolId(e.target.value)}>
          {device.tools.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("siteLabel")}
        <Input
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder={t("sitePlaceholder")}
          dir="ltr"
          required
          maxLength={260}
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t("answerLabel")}
        <select
          className={SELECT}
          value={mode}
          onChange={(e) => setMode(e.target.value as "ALLOW" | "DENY")}
        >
          <option value="ALLOW">{t("allow")}</option>
          <option value="DENY">{t("block")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("durationLabel")}
        <select className={SELECT} value={hours} onChange={(e) => setHours(e.target.value)}>
          <option value="">{t("forever")}</option>
          <option value="8">{t("hours8")}</option>
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" variant="primary" disabled={add.isPending}>
          {t("add")}
        </Button>
      </div>
      {add.isError && (
        <p role="alert" className="text-xs text-deny sm:col-span-2 lg:col-span-3">
          {t("addFailed")}
        </p>
      )}
    </form>
  );
}

/**
 * JAIL, "ask on new sites": the answers saved per device and tool, with Remove and Add. The
 * built-in allowed list and what is and is not filtered are stated in words (honest about
 * coverage: Linux command-line tools and what they run; on Windows only Claude Code's own connections).
 */
export function SitesView() {
  const t = useTranslations("personal.sites");
  const tp = useTranslations("personal.products.jail");
  const { data, isLoading, isError } = useSiteRules();
  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <p className="text-xs font-medium text-muted-foreground">
        {tp("name")} · {tp("subtitle")}
      </p>
      <div className="grid gap-1 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>{t("built")}</p>
        <p>{t("coverage")}</p>
      </div>
      {isLoading ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-deny">
          {t("unavailable")}
        </p>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ShieldCheckIcon} description={t("empty")} />
      ) : (
        <ul className="rounded-xl border border-border bg-card px-4">
          {data.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </ul>
      )}
      <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-medium">{t("addTitle")}</h2>
        <AddForm />
      </section>
    </div>
  );
}
