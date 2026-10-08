"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon, InfoIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { AgentStatusBadge } from "@/components/manar/agents/agent-status-badge";
import { EnrollmentTokenDialog } from "@/components/manar/agents/enrollment-token-dialog";
import { RevokeAgentDialog } from "@/components/manar/agents/revoke-agent-dialog";
import { AgentKillSwitchButton } from "@/components/manar/agents/agent-kill-switch-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApiErrorPanel } from "@/components/manar/api-error-state";
import { isNotFoundError } from "@/lib/api/errors";
import { useAgentDetail } from "@/hooks/use-agents";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function AgentDetailView({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.detail");
  const tAgents = useTranslations("agents");
  const format = useFormatter();
  const { data: agent, isPending, isError, error } = useAgentDetail(agentId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError && !isNotFoundError(error)) {
    return <ApiErrorPanel title={tAgents("title")} error={error} />;
  }
  if (isError || !agent) {
    return <NotFoundPanel title={tAgents("title")} body={t("notFoundBody")} />;
  }

  const revocable = agent.status === "ACTIVE" || agent.status === "PENDING_ENROLLMENT";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={agent.displayName}
        description={agent.identifier}
        actions={
          <div className="flex items-center gap-2">
            <EnrollmentTokenDialog
              agentId={agent.id}
              disabled={agent.status !== "PENDING_ENROLLMENT"}
            />
            <AgentKillSwitchButton agentId={agent.id} />
            <RevokeAgentDialog agentId={agent.id} disabled={!revocable} />
          </div>
        }
      />

      <Link
        href="/agents"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("identityTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("id")} value={<span className="font-mono text-xs">{agent.id}</span>} />
          <Field
            label={t("slug")}
            value={<span className="font-mono text-xs">{agent.slug}</span>}
          />
          <Field
            label={t("identifier")}
            value={<span className="font-mono text-xs break-all">{agent.identifier}</span>}
          />
          <Field label={t("status")} value={<AgentStatusBadge status={agent.status} />} />
          <Field
            label={t("createdAt")}
            value={format.dateTime(new Date(agent.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("certTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("certUnavailable")}</p>
      </section>
    </div>
  );
}
