"use client";

import { useTranslations } from "next-intl";
import { PlayIcon, ProhibitIcon, QuestionIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAgentKillSwitch, useSetAgentKillSwitch } from "@/hooks/use-agents";

/** One-click agent kill switch. It takes effect on the agent's next request: manar-api reads kill-switch state on every decision. */
export function AgentKillSwitchButton({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.killSwitch");
  const state = useAgentKillSwitch(agentId);
  const set = useSetAgentKillSwitch(agentId);

  // Loading or failed: the state is unknown. Never offer "activate" or
  // "release" on an assumption, and never render unknown as "off".
  if (state.isPending || state.isError) {
    return (
      <Button size="sm" variant="outline" disabled data-kill-switch-state="unknown">
        <QuestionIcon />
        {t("unknown")}
      </Button>
    );
  }

  const on = state.data !== null;
  return (
    <Button
      size="sm"
      variant={on ? "outline" : "destructive"}
      disabled={set.isPending}
      data-kill-switch-state={on ? "on" : "off"}
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
      {on ? <PlayIcon /> : <ProhibitIcon />}
      {on ? t("release") : t("activate")}
    </Button>
  );
}
