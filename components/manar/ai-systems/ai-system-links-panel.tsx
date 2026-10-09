"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { LinkBreakIcon, LinkIcon, LockIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentStatusBadge } from "@/components/manar/agents/agent-status-badge";
import { useUserNameResolver } from "@/components/manar/ai-systems/user-name";
import { observationFiguresAreMeasurements } from "@/components/manar/ai-systems/coverage";
import { useAgentsList, type AgentStatus } from "@/hooks/use-agents";
import { useAllToolsForPicker } from "@/hooks/use-tools";
import {
  useLinkAgent,
  useLinkTool,
  useUnlinkAgent,
  useUnlinkTool,
  type AiSystemCoverageValue,
  type AiSystemLinkedAgent,
  type AiSystemLinkedTool,
} from "@/hooks/use-ai-systems";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * Link/unlink agents and tools, reusing the console's existing pickers —
 * `useAgentsList` and `useAllToolsForPicker`, the same single-generous-page
 * sources the create-task grant builder already picks from — rather than
 * inventing a second selection UI for the same two registries.
 *
 * `POST /ai-systems/:id/agents` answers `linked: false` (not a 409) when
 * the agent was already linked, so a retried request is unambiguous; this
 * panel surfaces that distinction instead of reporting a no-op as a new
 * link.
 */
function LinkedAgentsSection({
  aiSystemId,
  linkedAgents,
  coverage,
  canManage,
}: {
  aiSystemId: string;
  linkedAgents: AiSystemLinkedAgent[];
  coverage: AiSystemCoverageValue;
  canManage: boolean;
}) {
  const t = useTranslations("aiSystems.links");
  const tCoverage = useTranslations("aiSystems.coverage");
  const format = useFormatter();
  const resolveUserName = useUserNameResolver();
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const agentsQuery = useAgentsList();
  const link = useLinkAgent(aiSystemId);
  const unlink = useUnlinkAgent(aiSystemId);

  const linkedIds = useMemo(
    () => new Set(linkedAgents.map((agent) => agent.agentId)),
    [linkedAgents],
  );
  const linkable = useMemo(
    () =>
      (agentsQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (agent) => !linkedIds.has(agent.id),
      ),
    [agentsQuery.data, linkedIds],
  );

  // When the observation source could not be consulted, every linked
  // agent's `lastObservedAt` comes back null because the query failed —
  // not because the agent was never seen. Rendering that as "never
  // observed" would restate an outage as a finding, exactly as it would
  // in the coverage panel.
  const observationsAreReal = observationFiguresAreMeasurements(coverage);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">{t("agentsTitle")}</h2>
      <p className="mb-3 max-w-prose text-xs text-muted-foreground">{t("agentsHint")}</p>

      {linkedAgents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("agentsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">{t("agentColumns.agent")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("agentColumns.status")}</th>
                <th className="px-2 py-1.5 text-start font-medium">
                  {t("agentColumns.lastObservedAt")}
                </th>
                <th className="px-2 py-1.5 text-start font-medium">{t("agentColumns.linkedAt")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("agentColumns.linkedBy")}</th>
                {canManage && <th className="px-2 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {linkedAgents.map((agent) => (
                <tr key={agent.agentId} className="border-b border-border last:border-0">
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col">
                      <span className="text-foreground">{agent.displayName}</span>
                      <span className="font-data text-2xs text-muted-foreground-tertiary">
                        {agent.slug}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <AgentStatusBadge status={agent.status as AgentStatus} />
                  </td>
                  <td className="px-2 py-1.5 text-xs">
                    {!observationsAreReal ? (
                      <span
                        className="inline-flex items-center gap-1 text-destructive"
                        title={tCoverage("figureUnavailableHint")}
                      >
                        <WarningIcon className="size-3" aria-hidden />
                        {tCoverage("figureUnavailable")}
                      </span>
                    ) : agent.lastObservedAt ? (
                      <span className="font-data text-muted-foreground">
                        {format.dateTime(new Date(agent.lastObservedAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("neverObserved")}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 font-data text-xs text-muted-foreground">
                    {format.dateTime(new Date(agent.linkedAt), { dateStyle: "medium" })}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">
                    {resolveUserName(agent.linkedBy)}
                  </td>
                  {canManage && (
                    <td className="px-2 py-1.5 text-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={t("unlinkAgentLabel", { name: agent.displayName })}
                        disabled={unlink.isPending}
                        onClick={() =>
                          unlink.mutate(agent.agentId, {
                            onSuccess: () =>
                              toast.success(t("agentUnlinked", { name: agent.displayName })),
                            onError: (error) => toast.error(apiErrorMessage(error)),
                          })
                        }
                      >
                        <LinkBreakIcon aria-hidden />
                        {unlink.isPending ? t("unlinking") : t("unlink")}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-system-link-agent">{t("linkAgentLabel")}</Label>
            <Select
              value={selectedAgentId}
              onValueChange={(value) => setSelectedAgentId((value as string) ?? "")}
            >
              <SelectTrigger id="ai-system-link-agent" className="w-64">
                {/* Base UI renders the raw value (an agent UUID) without a
                 * render function. */}
                <SelectValue placeholder={t("selectAgent")}>
                  {(value: string | null) =>
                    value ? (linkable.find((a) => a.id === value)?.displayName ?? value) : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {linkable.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!selectedAgentId || link.isPending}
            onClick={() => {
              const agent = linkable.find((a) => a.id === selectedAgentId);
              if (!agent) return;
              link.mutate(agent.id, {
                onSuccess: (result) => {
                  toast.success(
                    result?.linked
                      ? t("agentLinked", { name: agent.displayName })
                      : t("agentAlreadyLinked", { name: agent.displayName }),
                  );
                  setSelectedAgentId("");
                },
                onError: (error) => toast.error(apiErrorMessage(error, t("linkError"))),
              });
            }}
          >
            <LinkIcon aria-hidden />
            {link.isPending ? t("linking") : t("link")}
          </Button>
          {linkable.length === 0 && !agentsQuery.isPending && (
            <span className="text-xs text-muted-foreground">{t("noAgentsAvailable")}</span>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <LockIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("readOnly")}
        </p>
      )}
    </section>
  );
}

function LinkedToolsSection({
  aiSystemId,
  linkedTools,
  canManage,
}: {
  aiSystemId: string;
  linkedTools: AiSystemLinkedTool[];
  canManage: boolean;
}) {
  const t = useTranslations("aiSystems.links");
  const format = useFormatter();
  const resolveUserName = useUserNameResolver();
  const [selectedToolId, setSelectedToolId] = useState("");

  const toolsQuery = useAllToolsForPicker();
  const link = useLinkTool(aiSystemId);
  const unlink = useUnlinkTool(aiSystemId);

  const linkedIds = useMemo(() => new Set(linkedTools.map((tool) => tool.toolId)), [linkedTools]);
  const linkable = useMemo(
    () => (toolsQuery.data ?? []).filter((tool) => !linkedIds.has(tool.id)),
    [toolsQuery.data, linkedIds],
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">{t("toolsTitle")}</h2>
      <p className="mb-3 max-w-prose text-xs text-muted-foreground">{t("toolsHint")}</p>

      {linkedTools.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("toolsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">{t("toolColumns.tool")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("toolColumns.linkedAt")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("toolColumns.linkedBy")}</th>
                {canManage && <th className="px-2 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {linkedTools.map((tool) => (
                <tr key={tool.toolId} className="border-b border-border last:border-0">
                  <td className="px-2 py-1.5 text-foreground">{tool.name}</td>
                  <td className="px-2 py-1.5 font-data text-xs text-muted-foreground">
                    {format.dateTime(new Date(tool.linkedAt), { dateStyle: "medium" })}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">
                    {resolveUserName(tool.linkedBy)}
                  </td>
                  {canManage && (
                    <td className="px-2 py-1.5 text-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={t("unlinkToolLabel", { name: tool.name })}
                        disabled={unlink.isPending}
                        onClick={() =>
                          unlink.mutate(tool.toolId, {
                            onSuccess: () => toast.success(t("toolUnlinked", { name: tool.name })),
                            onError: (error) => toast.error(apiErrorMessage(error)),
                          })
                        }
                      >
                        <LinkBreakIcon aria-hidden />
                        {unlink.isPending ? t("unlinking") : t("unlink")}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-system-link-tool">{t("linkToolLabel")}</Label>
            <Select
              value={selectedToolId}
              onValueChange={(value) => setSelectedToolId((value as string) ?? "")}
            >
              <SelectTrigger id="ai-system-link-tool" className="w-64">
                <SelectValue placeholder={t("selectTool")}>
                  {(value: string | null) =>
                    value ? (linkable.find((tool) => tool.id === value)?.name ?? value) : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {linkable.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!selectedToolId || link.isPending}
            onClick={() => {
              const tool = linkable.find((candidate) => candidate.id === selectedToolId);
              if (!tool) return;
              link.mutate(tool.id, {
                onSuccess: (result) => {
                  toast.success(
                    result?.linked
                      ? t("toolLinked", { name: tool.name })
                      : t("toolAlreadyLinked", { name: tool.name }),
                  );
                  setSelectedToolId("");
                },
                onError: (error) => toast.error(apiErrorMessage(error, t("linkError"))),
              });
            }}
          >
            <LinkIcon aria-hidden />
            {link.isPending ? t("linking") : t("link")}
          </Button>
          {linkable.length === 0 && !toolsQuery.isPending && (
            <span className="text-xs text-muted-foreground">{t("noToolsAvailable")}</span>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <LockIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("readOnly")}
        </p>
      )}
    </section>
  );
}

export function AiSystemLinksPanel({
  aiSystemId,
  linkedAgents,
  linkedTools,
  coverage,
  canManage,
}: {
  aiSystemId: string;
  linkedAgents: AiSystemLinkedAgent[];
  linkedTools: AiSystemLinkedTool[];
  coverage: AiSystemCoverageValue;
  canManage: boolean;
}) {
  return (
    <>
      <LinkedAgentsSection
        aiSystemId={aiSystemId}
        linkedAgents={linkedAgents}
        coverage={coverage}
        canManage={canManage}
      />
      <LinkedToolsSection aiSystemId={aiSystemId} linkedTools={linkedTools} canManage={canManage} />
    </>
  );
}
