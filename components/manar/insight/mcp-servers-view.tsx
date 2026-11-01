"use client";

import { useTranslations } from "next-intl";
import { PlugsConnectedIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMcpServers } from "@/hooks/use-insight";
import { knownFlags, type McpServerRow } from "@/lib/insight/types";

function ServerItem({ s }: { s: McpServerRow }) {
  const t = useTranslations("insight.mcp");
  const flags = knownFlags(s.flags);
  const tool = s.toolId.replace(/^host\./, "");
  return (
    <li className="grid gap-2 border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 text-sm font-medium" dir="auto">
          {s.name}
          <span className="ms-2 text-xs font-normal text-muted-foreground">
            {t(`transport.${s.transport}`)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{t("on", { device: s.hostname, tool })}</p>
      </div>
      <p className="text-xs break-all text-muted-foreground" dir="ltr">
        {s.url ?? s.command}
        {s.package &&
          ` · ${t("package", { name: s.package })} ${s.version ? t("pinned", { version: s.version }) : t("unpinnedShort")}`}
        {!s.url && ` · ${t("args", { count: s.argCount })}`}
      </p>
      {s.envKeys.length > 0 && (
        <p className="text-xs text-muted-foreground" dir="ltr">
          {t("envKeys", { names: s.envKeys.join(", ") })}
        </p>
      )}
      {s.stale && <p className="text-xs text-wait">{t("stale")}</p>}
      {flags.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("noFlags")}. {t("noFlagsHint")}
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {flags.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Badge variant="wait" className="mt-0.5">
                <WarningIcon aria-hidden />
                {t(`flags.${f}.label`)}
              </Badge>
              <span className="text-muted-foreground">{t(`flags.${f}.body`)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** MCP servers per device and tool, with the deterministic flags explained in plain words. */
export function McpServersView() {
  const t = useTranslations("insight.mcp");
  const { data, isLoading, isError } = useMcpServers();
  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
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
        <EmptyState icon={PlugsConnectedIcon} title={t("emptyTitle")} description={t("empty")} />
      ) : (
        <section className="rounded-xl border border-border bg-card px-4">
          <ul>
            {data.map((s) => (
              <ServerItem key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
    </div>
  );
}
