"use client";

import { useTranslations } from "next-intl";
import { OctagonXIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAgentKillSwitch, useSetAgentKillSwitch } from "@/hooks/use-agents";

/** One-click agent kill switch. It takes effect on the agent's next request: manar-api reads kill-switch state on every decision. */
export function AgentKillSwitchButton({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.killSwitch");
  const { data: active, isPending } = useAgentKillSwitch(agentId);
  const set = useSetAgentKillSwitch(agentId);
  const on = Boolean(active);

  return (
    <Button
      size="sm"
      variant={on ? "outline" : "destructive"}
      disabled={isPending || set.isPending}
      onClick={() =>
        set.mutate(
          { active: !on, reason: on ? undefined : t("reason") },
          {
            onSuccess: () => toast.success(on ? t("released") : t("activated")),
            onError: () => toast.error(t("error")),
          },
        )
      }
    >
      {on ? <PlayIcon /> : <OctagonXIcon />}
      {on ? t("release") : t("activate")}
    </Button>
  );
}
