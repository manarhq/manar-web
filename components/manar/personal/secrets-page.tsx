"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ShieldCheckIcon, VaultIcon } from "@phosphor-icons/react/ssr";

import {
  useAccessDecision,
  useBlockMode,
  useSetBlockMode,
  type BlockMode,
  useSecretsOverview,
  useSecretsTimeline,
  useVaultAccess,
  useVaultAction,
  type AccessDecision,
  type SecretEvent,
  type SecretsOverview,
} from "@/hooks/use-secrets";
import { toolDisplayName } from "@/lib/personal/tool-stats";
import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const select =
  "h-(--density-control-height) rounded-md border border-input bg-card px-2 text-sm text-foreground";

/** What can be moved into the vault, from the event's path class. Others stay alert-only. */
function vaultKind(e: SecretEvent): "aws" | "ssh" | null {
  return e.pathClass === "aws" || e.pathClass === "ssh" ? e.pathClass : null;
}

function baseName(p: string | null): string {
  return (p ?? "").split(/[\\/]/).pop() ?? "";
}

function WaitingAccess() {
  const t = useTranslations("personal.secrets");
  const access = useVaultAccess();
  const decide = useAccessDecision();
  const rows = access.data ?? [];
  if (rows.length === 0) return null;
  const buttons: Array<[AccessDecision, string, "primary" | "outline" | "destructive"]> = [
    ["ALLOW_ONCE", "allowOnce", "primary"],
    ["ALLOW_8H", "allow8h", "outline"],
    ["ALLOW_ALWAYS", "allowAlways", "outline"],
    ["DENY", "deny", "destructive"],
  ];
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-4" aria-live="polite">
      <h2 className="text-base font-medium">{t("waitingTitle")}</h2>
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
        >
          <p className="text-sm">
            {r.kind === "file"
              ? t("wantsFile", { program: r.program, what: t(`classes.${r.ref}` as never) })
              : t("wants", { program: r.program, ref: `${r.kind}: ${r.ref}` })}
          </p>
          <p className="font-data text-xs break-all text-muted-foreground" dir="ltr">
            {r.programPath} · SHA-256 {r.programSha.slice(0, 12)}
          </p>
          <p className="text-xs text-muted-foreground">{t("interpreterWarning")}</p>
          <div className="flex flex-wrap gap-2">
            {buttons.map(([decision, key, variant]) => (
              <Button
                key={decision}
                size="sm"
                variant={variant}
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: r.id, decision })}
              >
                {t(key)}
              </Button>
            ))}
          </div>
        </div>
      ))}
      {decide.isError && <p className="text-sm text-deny">{t("decideFailed")}</p>}
    </section>
  );
}

function BlockSetting() {
  const t = useTranslations("personal.secrets");
  const mode = useBlockMode();
  const set = useSetBlockMode();
  const current: BlockMode | undefined = set.variables ?? mode.data?.blockMode;
  const options: BlockMode[] = ["keys", "all", "off"];
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <fieldset className="grid gap-2" disabled={!current || set.isPending}>
        <legend className="mb-1 text-base font-medium">{t("settings.title")}</legend>
        <p className="text-sm text-muted-foreground">{t("settings.intro")}</p>
        {options.map((o) => (
          <label key={o} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="blockMode"
              className="mt-1"
              checked={current === o}
              onChange={() => set.mutate(o)}
            />
            <span className="grid">
              <span className="font-medium">{t(`settings.${o}` as never)}</span>
              <span className="text-xs text-muted-foreground">
                {t(`settings.${o}Hint` as never)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">{t("settings.platforms")}</p>
      {(set.isError || mode.isError) && <p className="text-sm text-deny">{t("settings.failed")}</p>}
    </section>
  );
}

function ByTool({ overview }: { overview?: SecretsOverview }) {
  const t = useTranslations("personal.secrets");
  const format = useFormatter();
  const tools = overview?.tools ?? [];
  return (
    <section className="grid content-start gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-medium">{t("byTool")}</h2>
      {!overview ? (
        <Skeleton className="h-16 w-full" aria-busy />
      ) : tools.length === 0 ? (
        <EmptyState icon={ShieldCheckIcon} description={t("byToolNone")} className="py-6" />
      ) : (
        <ul className="grid">
          {tools.map((tool) => (
            <li
              key={tool.toolId}
              className="grid gap-1 border-t border-border py-2 text-sm first:border-t-0"
            >
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{toolDisplayName(tool.toolId)}</span>
                <span className="text-xs text-muted-foreground">
                  {t("touchedCount", { count: tool.touched })}
                  {tool.blocked > 0 ? ` · ${t("blockedCount", { count: tool.blocked })}` : ""}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {Object.keys(tool.classes)
                  .map((c) => t(`classes.${c}` as never))
                  .join(" · ")}
                {tool.lastAt
                  ? ` · ${t("lastSeen", { time: format.dateTime(new Date(tool.lastAt), { dateStyle: "short", timeStyle: "short" }) })}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Devices({ overview }: { overview?: SecretsOverview }) {
  const t = useTranslations("personal.secrets");
  const action = useVaultAction();
  const devices = overview?.devices ?? [];
  if (devices.length === 0) return null;
  return (
    <section className="grid content-start gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-medium">{t("devices")}</h2>
      <ul className="grid">
        {devices.map((d) => (
          <li
            key={d.hostId}
            className="grid gap-1.5 border-t border-border py-2 text-sm first:border-t-0"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{d.hostname}</span>
              <span
                className={cn(
                  "text-xs",
                  d.watcher === "ok"
                    ? "text-allow"
                    : d.watcher === "unknown"
                      ? "text-muted-foreground"
                      : "text-wait",
                )}
              >
                {t(`watcher.${d.watcher}` as never)}
              </span>
            </p>
            {d.vault.some((v) => v.state === "AVAILABLE") && (
              <p className="text-xs text-muted-foreground">{t("moveHint")}</p>
            )}
            {d.vault.length > 0 && (
              <ul className="grid gap-1" aria-label={t("vaultTitle")}>
                {d.vault.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span>
                      <span className="font-data">
                        {v.kind}: {v.ref}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {t(`vault.${v.state}` as never)}
                      </span>
                      {v.state === "FAILED" && v.detail ? (
                        <span className="text-muted-foreground"> · {v.detail}</span>
                      ) : null}
                    </span>
                    {v.state === "AVAILABLE" && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({ hostId: d.hostId, kind: v.kind, ref: v.ref })
                        }
                      >
                        <VaultIcon aria-hidden />
                        {t("moveToVault")}
                      </Button>
                    )}
                    {v.state === "STORED" && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({
                            hostId: d.hostId,
                            kind: v.kind,
                            ref: v.ref,
                            restore: true,
                          })
                        }
                      >
                        {t("restore")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProtectAction({ event }: { event: SecretEvent }) {
  const t = useTranslations("personal.secrets");
  const kind = vaultKind(event);
  const action = useVaultAction();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(kind === "ssh" ? baseName(event.maskedPath) : "default");
  if (!kind || event.type !== "secret.touched") return null;
  if (action.isSuccess) return <p className="text-xs text-allow">{t("protectSent")}</p>;
  return (
    <div className="grid gap-1.5">
      {!open ? (
        <Button
          size="xs"
          variant="outline"
          className="justify-self-start"
          onClick={() => setOpen(true)}
        >
          <VaultIcon aria-hidden />
          {t("protect")}
        </Button>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate({ hostId: event.hostId, kind, ref: ref.trim() });
          }}
        >
          <label className="grid gap-0.5 text-xs text-muted-foreground">
            {kind === "aws" ? t("profile") : t("classes.ssh")}
            <input
              className={cn(select, "font-data")}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <Button size="sm" type="submit" disabled={action.isPending || ref.trim() === ""}>
            {t("protectSend")}
          </Button>
        </form>
      )}
      {open && <p className="text-xs text-muted-foreground">{t("protectHint")}</p>}
      {action.isError && <p className="text-xs text-deny">{t("protectFailed")}</p>}
    </div>
  );
}

function eventText(t: ReturnType<typeof useTranslations>, e: SecretEvent): string {
  const path = e.maskedPath ?? "";
  switch (e.type) {
    case "secret.vault.stored":
      return t("event.vaultStored", { path });
    case "secret.vault.released":
      return t("event.vaultReleased", { process: e.process ?? "", path });
    case "secret.vault.denied":
      return t("event.vaultDenied", { process: e.process ?? "", path });
    default:
      return t("event.touched", {
        tool: e.toolId ? toolDisplayName(e.toolId) : (e.process ?? ""),
        path,
      });
  }
}

export function SecretsPage() {
  const t = useTranslations("personal.secrets");
  const format = useFormatter();
  const [hostId, setHostId] = useState("");
  const [toolId, setToolId] = useState("");
  const overview = useSecretsOverview();
  const timeline = useSecretsTimeline({ hostId, toolId });
  const events = useMemo(() => timeline.data?.pages.flatMap((p) => p.items) ?? [], [timeline.data]);

  return (
    <div className="grid gap-5">
      <PageHeader title={t("pageTitle")} description={t("pageIntro")} />
      <WaitingAccess />
      <BlockSetting />
      <div className="grid gap-5 lg:grid-cols-2">
        <ByTool overview={overview.data} />
        <Devices overview={overview.data} />
      </div>
      <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-medium">{t("timelineTitle")}</h2>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-0.5 text-xs text-muted-foreground">
              {t("filterDevice")}
              <select className={select} value={hostId} onChange={(e) => setHostId(e.target.value)}>
                <option value="">{t("filterAll")}</option>
                {(overview.data?.devices ?? []).map((d) => (
                  <option key={d.hostId} value={d.hostId}>
                    {d.hostname}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5 text-xs text-muted-foreground">
              {t("filterTool")}
              <select className={select} value={toolId} onChange={(e) => setToolId(e.target.value)}>
                <option value="">{t("filterAll")}</option>
                {(overview.data?.tools ?? []).map((tool) => (
                  <option key={tool.toolId} value={tool.toolId}>
                    {toolDisplayName(tool.toolId)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {timeline.isError ? (
          <p className="text-sm text-deny">{t("loadFailed")}</p>
        ) : timeline.isLoading ? (
          <Skeleton className="h-24 w-full" aria-busy />
        ) : events.length === 0 ? (
          <EmptyState icon={ShieldCheckIcon} description={t("timelineEmpty")} className="py-8" />
        ) : (
          <ul className="grid">
            {events.map((e) => (
              <li
                key={e.id}
                className="grid gap-1 border-t border-border py-2.5 text-sm first:border-t-0"
              >
                <p className="break-words">
                  <span className="font-data text-xs">{eventText(t, e)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.blocked ? t("blocked") : t("allowed")} ·{" "}
                  {e.hostname ? `${t("on", { device: e.hostname })} · ` : ""}
                  {format.dateTime(new Date(e.at), { dateStyle: "short", timeStyle: "short" })}
                </p>
                <ProtectAction event={e} />
              </li>
            ))}
          </ul>
        )}
        {timeline.hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            disabled={timeline.isFetchingNextPage}
            onClick={() => void timeline.fetchNextPage()}
          >
            {t("loadMore")}
          </Button>
        )}
      </section>
    </div>
  );
}
