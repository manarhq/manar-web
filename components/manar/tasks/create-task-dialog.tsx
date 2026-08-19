"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentsList } from "@/hooks/use-agents";
import { useAllToolsForPicker } from "@/hooks/use-tools";
import { useCreateTask } from "@/hooks/use-tasks";
import { apiErrorMessage } from "@/lib/api/errors";

interface GrantRow {
  key: string;
  toolName: string;
  actionName: string;
  resourcePattern: string;
}

function isoOrUndefined(local: string): string | undefined {
  if (!local) return undefined;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function CreateTaskDialog() {
  const t = useTranslations("tasks.createDialog");
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [riskCeiling, setRiskCeiling] = useState("20");
  const [maxExecutions, setMaxExecutions] = useState("");
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [draftTool, setDraftTool] = useState("");
  const [draftAction, setDraftAction] = useState("");
  const [draftPattern, setDraftPattern] = useState("*");

  const agentsQuery = useAgentsList({ status: "ACTIVE" });
  const agents = agentsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const toolsQuery = useAllToolsForPicker();
  const tools = toolsQuery.data ?? [];
  const draftToolActions = tools.find((tool) => tool.name === draftTool)?.actions ?? [];

  const createTask = useCreateTask();

  function reset() {
    setName("");
    setDescription("");
    setAssignedAgentId("");
    setExpiresAt("");
    setRiskCeiling("20");
    setMaxExecutions("");
    setGrants([]);
    setDraftTool("");
    setDraftAction("");
    setDraftPattern("*");
    createTask.reset();
  }

  const canSubmit =
    name.trim().length > 0 &&
    Boolean(assignedAgentId) &&
    Boolean(expiresAt) &&
    riskCeiling !== "" &&
    !createTask.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        <span>{tTasks("newTask")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createTask.mutate(
              {
                name: name.trim(),
                description: description.trim() || undefined,
                assignedAgentId,
                allowedToolActions: grants.map((g) => ({
                  toolId: g.toolName,
                  actionId: g.actionName,
                })),
                allowedResourceSelectors: dedupeSelectors(
                  grants.map((g) => ({ toolId: g.toolName, pattern: g.resourcePattern })),
                ),
                forbiddenActions: [],
                expiresAt: isoOrUndefined(expiresAt)!,
                riskCeiling: Number(riskCeiling),
                maxExecutions: maxExecutions ? Number(maxExecutions) : undefined,
              },
              {
                onSuccess: () => {
                  toast.success(t("success", { name: name.trim() }));
                  setOpen(false);
                  reset();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-name">{t("nameLabel")}</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={200}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-description">{t("descriptionLabel")}</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={2000}
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-agent">{t("assignedAgentLabel")}</Label>
              <Select
                value={assignedAgentId}
                onValueChange={(value) => setAssignedAgentId(value ?? "")}
              >
                <SelectTrigger id="task-agent" className="w-full">
                  <SelectValue placeholder={t("assignedAgentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.displayName} ({agent.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div>
                <Label>{t("grantsTitle")}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("grantsHint")}</p>
              </div>

              {grants.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noGrantsYet")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {grants.map((grant) => (
                    <li
                      key={grant.key}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      <span className="font-mono">
                        {grant.toolName} · {grant.actionName} · {grant.resourcePattern}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t("removeGrant")}
                        onClick={() =>
                          setGrants((current) => current.filter((g) => g.key !== grant.key))
                        }
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Select
                  value={draftTool}
                  onValueChange={(value) => {
                    setDraftTool(value ?? "");
                    setDraftAction("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("toolPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.name}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draftAction}
                  onValueChange={(value) => setDraftAction(value ?? "")}
                  disabled={!draftTool}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("actionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {draftToolActions.map((action) => (
                      <SelectItem key={action.id} value={action.name}>
                        {action.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={draftPattern}
                  onChange={(e) => setDraftPattern(e.target.value)}
                  aria-label={t("resourcePatternLabel")}
                  placeholder="*"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!draftTool || !draftAction}
                  onClick={() => {
                    setGrants((current) => [
                      ...current,
                      {
                        key: `${draftTool}:${draftAction}:${draftPattern}:${current.length}`,
                        toolName: draftTool,
                        actionName: draftAction,
                        resourcePattern: draftPattern || "*",
                      },
                    ]);
                    setDraftAction("");
                    setDraftPattern("*");
                  }}
                >
                  {t("addGrant")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-expires">{t("expiresAtLabel")}</Label>
                <Input
                  id="task-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-risk">{t("riskCeilingLabel")}</Label>
                <Input
                  id="task-risk"
                  type="number"
                  min={0}
                  max={100}
                  value={riskCeiling}
                  onChange={(e) => setRiskCeiling(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="task-max-executions">{t("maxExecutionsLabel")}</Label>
                <Input
                  id="task-max-executions"
                  type="number"
                  min={1}
                  value={maxExecutions}
                  onChange={(e) => setMaxExecutions(e.target.value)}
                  placeholder={t("maxExecutionsPlaceholder")}
                />
              </div>
            </div>

            {createTask.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(createTask.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createTask.isPending ? tCommon("creating") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function dedupeSelectors(
  selectors: { toolId: string; pattern: string }[],
): { toolId: string; pattern: string }[] {
  const seen = new Set<string>();
  return selectors.filter((s) => {
    const key = `${s.toolId}:${s.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
