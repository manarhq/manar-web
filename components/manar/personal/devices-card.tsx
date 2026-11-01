"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { DesktopTowerIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import type { Host } from "@/hooks/use-hosts";
import { HOST_UNKNOWN, toolDisplayName, type ToolCounts } from "@/lib/personal/tool-stats";
import { ADD_DEVICE_HREF } from "@/lib/personal/nav";
import { EmptyState } from "@/components/manar/empty-state";
import { StateChip } from "@/components/manar/personal/state-chip";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DevicesCardProps {
  hosts: Host[];
  /** Tool counts by host id (HOST_UNKNOWN for events with no host); see lib/personal/tool-stats. */
  toolsByHost: Map<string, ToolCounts[]>;
  isLoading?: boolean;
  unavailable?: boolean;
  /** Reference time, injectable for tests. */
  now?: number;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function statusKey(
  host: Host,
  now: number,
): "online" | "offline" | "pending" | "rejected" | "revoked" {
  if (host.status === "PENDING") return "pending";
  if (host.status === "REJECTED") return "rejected";
  if (host.status === "REVOKED") return "revoked";
  const seen = host.lastSeenAt ? Date.parse(host.lastSeenAt) : NaN;
  return Number.isFinite(seen) && now - seen <= ONLINE_WINDOW_MS ? "online" : "offline";
}

function ToolRows({ tools }: { tools: ToolCounts[] }) {
  const t = useTranslations("personal.devices");
  return (
    <ul className="grid">
      {tools.map((tool) => (
        <li
          key={tool.toolId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-sm"
        >
          <span className="truncate">{toolDisplayName(tool.toolId)}</span>
          <span className="flex flex-wrap justify-end gap-1.5">
            {tool.allowed > 0 && (
              <StateChip
                kind="allowed"
                count={tool.allowed}
                label={t("allowed", { count: tool.allowed })}
              />
            )}
            {tool.waiting > 0 && (
              <StateChip
                kind="waiting"
                count={tool.waiting}
                label={t("waiting", { count: tool.waiting })}
              />
            )}
            {tool.blocked > 0 && (
              <StateChip
                kind="blocked"
                count={tool.blocked}
                label={t("blocked", { count: tool.blocked })}
              />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Devices with per-tool allowed / waiting / blocked chips. Hosts come from the hosts API; tool
 * counts from today's audit events and pending approvals. Tools show an empty state until a
 * device reports its AI tool inventory (coverage track). Events that carry no host id are shown
 * once, under "AI tools", rather than guessed onto a device.
 */
export function DevicesCard({ hosts, toolsByHost, isLoading, unavailable, now }: DevicesCardProps) {
  const t = useTranslations("personal.devices");
  const format = useFormatter();
  const [mountedAt] = useState(() => Date.now());
  const at = now ?? mountedAt;
  const unattributed = toolsByHost.get(HOST_UNKNOWN) ?? [];

  return (
    <section className="grid content-start gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-baseline justify-between gap-2 text-base font-medium">
        {t("title")}
        <Link href="/hosts" className="text-sm font-normal text-blue-text hover:underline">
          {t("all")}
        </Link>
      </h3>

      {isLoading ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : unavailable ? (
        <p role="alert" className="text-sm text-deny">
          {t("unavailable")}
        </p>
      ) : hosts.length === 0 ? (
        <EmptyState
          icon={DesktopTowerIcon}
          description={t("empty")}
          action={
            <Link href={ADD_DEVICE_HREF} className={cn(buttonVariants({ variant: "primary" }))}>
              {t("addFirst")}
            </Link>
          }
        />
      ) : (
        <>
          {hosts.map((host) => {
            const status = statusKey(host, at);
            const tools = toolsByHost.get(host.id) ?? [];
            return (
              <div
                key={host.id}
                className="grid gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{host.hostname}</span>
                  <span className="text-xs text-muted-foreground">
                    {host.os} · {t(status)}
                    {host.lastSeenAt && status === "offline"
                      ? ` · ${format.relativeTime(new Date(host.lastSeenAt), at)}`
                      : ""}
                  </span>
                </div>
                {tools.length > 0 ? (
                  <ToolRows tools={tools} />
                ) : (
                  unattributed.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("noTools")}</p>
                  )
                )}
              </div>
            );
          })}
          {unattributed.length > 0 && (
            <div className="grid gap-1 border-t border-border pt-3">
              <span className="text-xs font-medium text-muted-foreground">{t("toolsTitle")}</span>
              <ToolRows tools={unattributed} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
