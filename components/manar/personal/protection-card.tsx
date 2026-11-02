"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheckIcon, ShieldWarningIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Link } from "@/i18n/navigation";
import { apiErrorStatus } from "@/lib/api/errors";
import { useProtection, useSetProtection } from "@/hooks/use-ai-tools";
import { useHostDecision } from "@/hooks/use-hosts";
import { ADD_DEVICE_HREF } from "@/lib/personal/nav";
import {
  restartCommand,
  type ProtectionProblem,
  type ProtectionStatus,
} from "@/lib/personal/ai-tools";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MODULES = ["door", "jail", "warden", "secrets-watch", "discovery", "protect"] as const;

function useModuleName() {
  const t = useTranslations("personal.protection.modules");
  return (m: string | undefined) =>
    MODULES.includes(m as (typeof MODULES)[number]) ? t(m as (typeof MODULES)[number]) : (m ?? "");
}

/** The one button that fixes a problem, or takes you to the fix. */
function FixButton({ problem, status }: { problem: ProtectionProblem; status: ProtectionStatus }) {
  const t = useTranslations("personal.protection");
  const queryClient = useQueryClient();
  const decide = useHostDecision();
  const protect = useSetProtection();
  const [copied, setCopied] = useState(false);
  const link = (href: string, label: string) => (
    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      {label}
    </Link>
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-tools"] });

  switch (problem.code) {
    case "no_device":
      return (
        <Link
          href={ADD_DEVICE_HREF}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
        >
          {t("fix.addDevice")}
        </Link>
      );
    case "device_pending":
      return (
        <Button
          size="sm"
          variant="primary"
          disabled={decide.isPending}
          aria-busy={decide.isPending}
          onClick={() =>
            decide.mutate(
              { id: problem.hostId!, decision: "approve" },
              {
                onSuccess: () => {
                  toast.success(t("approved", { device: problem.hostname ?? "" }));
                  void refresh();
                },
                onError: () => toast.error(t("failed")),
              },
            )
          }
        >
          {decide.isPending ? t("fix.approving") : t("fix.approve")}
        </Button>
      );
    case "tool_off":
      return (
        <Button
          size="sm"
          variant="primary"
          disabled={protect.isPending}
          aria-busy={protect.isPending}
          onClick={() =>
            protect.mutate(
              { hostId: problem.hostId!, toolId: problem.toolId!, protect: true },
              {
                onSuccess: () => toast.success(t("protectAsked", { tool: problem.toolName ?? "" })),
                onError: () => toast.error(t("failed")),
              },
            )
          }
        >
          {protect.isPending ? t("fix.protecting") : t("fix.protect")}
        </Button>
      );
    case "tool_not_applied":
      return link("/ai-tools", t("fix.seeWhy"));
    case "tool_seen_only":
      return link("/ai-tools", t("fix.learnMore"));
    case "module_missing":
      return link(ADD_DEVICE_HREF, t("fix.reinstall"));
    case "device_never_synced":
    case "device_offline":
    case "module_down": {
      const os = status.devices.find((d) => d.hostId === problem.hostId)?.os;
      const cmd = restartCommand(os);
      return (
        <Button
          size="sm"
          variant="outline"
          title={cmd}
          onClick={() =>
            void navigator.clipboard.writeText(cmd).then(
              () => {
                setCopied(true);
                toast.success(t("copied", { command: cmd }));
              },
              () => toast.error(t("copyFailed", { command: cmd })),
            )
          }
        >
          {copied ? t("fix.copiedRestart") : t("fix.copyRestart")}
        </Button>
      );
    }
  }
}

function ProblemSentence({ problem }: { problem: ProtectionProblem }) {
  const t = useTranslations("personal.protection.problem");
  const format = useFormatter();
  const moduleName = useModuleName();
  const device = problem.hostname ?? "";
  const tool = problem.toolName ?? "";
  switch (problem.code) {
    case "device_offline":
      return t("device_offline", {
        device,
        since: problem.lastSeenAt ? format.relativeTime(new Date(problem.lastSeenAt)) : "",
      });
    case "module_down":
    case "module_missing":
      return t(problem.code, { device, part: moduleName(problem.module) });
    default:
      return t(problem.code, { device, tool });
  }
}

/**
 * "Am I protected?": the first thing on Home. One big state ("All protected" or "N things to
 * fix") and, for each problem, one plain sentence and one button. The problems come from
 * manar-api, which makes the checks `manar-edge status` makes on the device, so the two agree. A
 * failed or missing answer is said as such: it is never shown as protected.
 */
export function ProtectionCard({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const t = useTranslations("personal.protection");
  const q = useProtection();
  const Heading = headingLevel === 1 ? "h1" : "h2";

  if (q.isLoading) {
    return (
      <section
        aria-busy
        aria-label={t("checking")}
        className="grid gap-3 rounded-xl border border-border bg-card p-5"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
      </section>
    );
  }

  // A role that may not read devices sees nothing here, rather than a check that always fails.
  if (q.isError && apiErrorStatus(q.error) === 403) return null;

  if (q.isError || !q.data) {
    return (
      <section
        data-testid="protection-card"
        data-state="unknown"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"
      >
        <div>
          <Heading className="text-xl font-medium text-foreground">{t("unknownTitle")}</Heading>
          <p className="text-sm text-muted-foreground">{t("unknownBody")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          {q.isFetching ? t("checking") : t("retry")}
        </Button>
      </section>
    );
  }

  const { ok, problems } = q.data;
  return (
    <section
      data-testid="protection-card"
      data-state={ok ? "ok" : "problems"}
      aria-labelledby="protection-title"
      className={
        ok
          ? "grid gap-2 rounded-xl border border-allow bg-allow-soft p-5"
          : "grid gap-4 rounded-xl border border-orange bg-card p-5"
      }
    >
      <div className="flex items-center gap-3">
        {ok ? (
          <ShieldCheckIcon aria-hidden weight="fill" className="size-9 shrink-0 text-allow" />
        ) : (
          <ShieldWarningIcon
            aria-hidden
            weight="fill"
            className="size-9 shrink-0 text-orange-text"
          />
        )}
        <div>
          <Heading
            id="protection-title"
            aria-live="polite"
            className="text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {ok ? t("allProtected") : t("toFix", { count: problems.length })}
          </Heading>
          <p className="text-sm text-muted-foreground">
            {ok ? t("allProtectedBody") : t("toFixBody")}
          </p>
        </div>
      </div>
      {!ok && (
        <ul className="grid divide-y divide-border">
          {problems.map((p, i) => (
            <li
              key={`${p.code}:${p.hostId ?? ""}:${p.toolId ?? p.module ?? i}`}
              data-code={p.code}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
            >
              <p className="min-w-0 flex-1 basis-60 text-sm text-foreground">
                <ProblemSentence problem={p} />
              </p>
              <FixButton problem={p} status={q.data} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
