"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CloudIcon, SparkleIcon } from "@phosphor-icons/react/ssr";

import { useAiTools, useSetProtection } from "@/hooks/use-ai-tools";
import { Link } from "@/i18n/navigation";
import { ADD_DEVICE_HREF } from "@/lib/personal/nav";
import type { AiToolRow, AiToolsDevice } from "@/lib/personal/ai-tools";
import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { ProtectionChip } from "@/components/manar/ai-tools/protection-chip";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function ToolItem({ device, tool }: { device: AiToolsDevice; tool: AiToolRow }) {
  const t = useTranslations("personal.aiTools");
  const set = useSetProtection();
  const canProtect = tool.supportedModes.length > 0 && device.status === "APPROVED";
  const label = t("protectLabel", { tool: tool.name, device: device.hostname });
  return (
    <li className="grid gap-2 border-t border-border py-3 first:border-t-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {tool.name}{" "}
            <span className="font-normal text-muted-foreground">
              {tool.version ? t("version", { version: tool.version }) : t("versionUnknown")}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {canProtect
              ? t("supports", { modes: tool.supportedModes.map((m) => t(`mode.${m}`)).join(", ") })
              : tool.supportedModes.length === 0
                ? t("seenOnly")
                : t("afterApproval")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProtectionChip tool={tool} />
          <Switch
            aria-label={label}
            checked={tool.desiredProtection && canProtect}
            disabled={!canProtect || set.isPending}
            onCheckedChange={(checked) =>
              set.mutate({ hostId: device.hostId, toolId: tool.toolId, protect: checked })
            }
          />
        </div>
      </div>
      {set.isError && (
        <p role="alert" className="text-xs text-deny">
          {t("switchFailed")}
        </p>
      )}
      {tool.changes.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer text-blue-text">{t("changes")}</summary>
          <ul className="mt-1 grid gap-1 ps-4">
            {tool.changes.map((c) => (
              <li key={c} className="break-all" dir="auto">
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function DeviceSection({ device }: { device: AiToolsDevice }) {
  const t = useTranslations("personal.aiTools");
  const format = useFormatter();
  return (
    <section className="grid content-start gap-1 rounded-xl border border-border bg-card p-4">
      <h2 className="flex flex-wrap items-baseline justify-between gap-2 text-base font-medium">
        {device.hostname}
        <span className="text-xs font-normal text-muted-foreground">
          {device.os} ·{" "}
          {device.status === "PENDING"
            ? t("pending")
            : device.online
              ? t("online")
              : device.lastSeenAt
                ? t("lastSeen", { when: format.relativeTime(new Date(device.lastSeenAt)) })
                : t("offline")}
        </span>
      </h2>
      {device.tools.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{t("noTools")}</p>
      ) : (
        <ul>
          {device.tools.map((tool) => (
            <ToolItem key={tool.toolId} device={device} tool={tool} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * AI tools: per device, every tool Manar found, how it is protected, the enforcement label it has
 * earned, and a Protect switch. Turning protection off makes the device put that tool's backed-up
 * settings back; the list of changes is the same list the installer printed.
 */
export function AiToolsView() {
  const t = useTranslations("personal.aiTools");
  const { data, isLoading, isError } = useAiTools();
  return (
    <div className="grid gap-5">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href={"/ai-tools/spend" as never}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("spendLink")}
          </Link>
        }
      />
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
        <EmptyState
          icon={SparkleIcon}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Link href={ADD_DEVICE_HREF} className={cn(buttonVariants({ variant: "primary" }))}>
              {t("addDevice")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((d) => (
            <DeviceSection key={d.hostId} device={d} />
          ))}
        </div>
      )}
      <section className="grid gap-2 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <CloudIcon aria-hidden className="size-5" />
          {t("cloudTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("cloudBody")}</p>
        <div>
          <Link
            href={"/ai-tools/cloud" as never}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("cloudLink")}
          </Link>
        </div>
      </section>
    </div>
  );
}
