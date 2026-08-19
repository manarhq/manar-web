"use client";

import { useTranslations, useFormatter } from "next-intl";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { TaskStatusBadge } from "@/components/manar/tasks/task-status-badge";
import { RevokeTaskDialog } from "@/components/manar/tasks/revoke-task-dialog";
import { RiskMeter } from "@/components/manar/risk-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskDetail, useTaskDelegationChain } from "@/hooks/use-tasks";
import { useAgentDetail } from "@/hooks/use-agents";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function AssignedAgentLabel({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentDetail(agentId);
  return (
    <Link href={`/agents/${agentId}`} className="text-primary hover:underline">
      {agent?.displayName ?? agentId}
    </Link>
  );
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const t = useTranslations("tasks.detail");
  const tTasks = useTranslations("tasks");
  const format = useFormatter();
  const { data: task, isPending, isError } = useTaskDetail(taskId);
  const { parent, children } = useTaskDelegationChain(task);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !task) {
    return <NotFoundPanel title={tTasks("title")} body={t("notFoundBody")} />;
  }

  const revocable = task.status === "PENDING" || task.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={task.name}
        description={task.description ?? undefined}
        actions={<RevokeTaskDialog taskId={task.id} disabled={!revocable} />}
      />

      <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("id")} value={<span className="font-mono text-xs">{task.id}</span>} />
          <Field label={t("status")} value={<TaskStatusBadge status={task.status} />} />
          <Field
            label={t("assignedAgent")}
            value={<AssignedAgentLabel agentId={task.assignedAgentId} />}
          />
          <Field
            label={t("startsAt")}
            value={format.dateTime(new Date(task.startsAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <Field
            label={t("expiresAt")}
            value={format.dateTime(new Date(task.expiresAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <Field
            label={t("createdAt")}
            value={format.dateTime(new Date(task.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
        <div className="mt-4">
          <RiskMeter score={task.riskCeiling} label={t("riskCeiling")} />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("grantsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("grantsNote")}</p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("delegationTitle")}</h2>

        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">{t("parentTask")}</span>
            {!task.parentTaskId ? (
              <p className="mt-1 text-sm text-muted-foreground">{t("noParent")}</p>
            ) : parent?.isPending ? (
              <Skeleton className="mt-1 h-5 w-40" />
            ) : parent?.data ? (
              <Link
                href={`/tasks/${parent.data.id}`}
                className="mt-1 block text-sm text-primary hover:underline"
              >
                {parent.data.name}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{task.parentTaskId}</p>
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">{t("childTasks")}</span>
            {children.isPending ? (
              <Skeleton className="mt-1 h-5 w-40" />
            ) : children.data && children.data.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1">
                {children.data.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/tasks/${child.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {child.name}
                    </Link>{" "}
                    <TaskStatusBadge status={child.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t("noChildren")}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
