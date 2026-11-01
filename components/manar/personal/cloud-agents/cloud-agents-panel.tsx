"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CloudIcon, CopyIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/components/manar/empty-state";
import {
  isPlanLimitPayload,
  PlanLimitNotice,
  type PlanLimitPayload,
} from "@/components/manar/plan-limit-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCloudAgents,
  useConfirmCloudClient,
  useConnectCloudAgent,
  useDisconnectCloudAgent,
  useSetRedirectUris,
  type CloudAgent,
  type ConnectedCloudAgent,
} from "@/hooks/use-cloud-agents";
import {
  agentSlug,
  CLOUD_PROVIDERS,
  standingTask,
  type CloudProvider,
} from "@/lib/personal/cloud-providers";

const PROVIDERS = Object.keys(CLOUD_PROVIDERS) as CloudProvider[];
const STEPS: Record<CloudProvider, string[]> = {
  chatgpt: ["1", "2", "3", "4", "5"],
  claude: ["1", "2", "3", "4"],
  copilot: ["1", "2", "3", "4", "5"],
};

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const t = useTranslations("cloudAgents");
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} dir="ltr" className="font-mono text-xs" />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => setCopied(true));
          }}
        >
          <CopyIcon aria-hidden />
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      {secret && <p className="text-xs text-wait">{t("result.secretOnce")}</p>}
    </div>
  );
}

function ConnectResult({
  provider,
  result,
  onDone,
}: {
  provider: CloudProvider;
  result: ConnectedCloudAgent;
  onDone: () => void;
}) {
  const t = useTranslations("cloudAgents");
  const [callback, setCallback] = useState("");
  const setUris = useSetRedirectUris();
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-base font-medium">
        {t("result.title", { provider: t(`providers.${provider}`) })}
      </h3>
      <ol className="grid list-decimal gap-1 ps-5 text-sm">
        {STEPS[provider].map((n) => (
          <li key={n}>{t(`steps.${provider}.${n}`)}</li>
        ))}
      </ol>
      <CopyField label={t("result.address")} value={result.mcpUrl} />
      {result.clientId && <CopyField label={t("result.clientId")} value={result.clientId} />}
      {result.clientSecret && (
        <CopyField label={t("result.clientSecret")} value={result.clientSecret} secret />
      )}
      {provider === "copilot" && (
        <>
          <CopyField label={t("result.authorizationUrl")} value={result.authorizationUrl} />
          <CopyField label={t("result.tokenUrl")} value={result.tokenUrl} />
          <CopyField label={t("result.refreshUrl")} value={result.refreshUrl} />
          <CopyField label={t("result.scope")} value={result.scopes.join(" ")} />
          <div className="grid gap-1">
            <Label htmlFor="callback">{t("result.callback")}</Label>
            <div className="flex gap-2">
              <Input
                id="callback"
                dir="ltr"
                inputMode="url"
                value={callback}
                onChange={(e) => setCallback(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!callback.startsWith("https://") || setUris.isPending}
                onClick={() =>
                  setUris.mutate({ id: result.agent.id, redirectUris: [callback.trim()] })
                }
              >
                {setUris.isSuccess ? t("result.callbackSaved") : t("result.callbackSave")}
              </Button>
            </div>
          </div>
        </>
      )}
      <div>
        <Button type="button" variant="primary" onClick={onDone}>
          {t("result.done")}
        </Button>
      </div>
    </section>
  );
}

function AgentRow({ agent }: { agent: CloudAgent }) {
  const t = useTranslations("cloudAgents");
  const confirm = useConfirmCloudClient();
  const disconnect = useDisconnectCloudAgent();
  const waiting =
    agent.status === "ACTIVE" &&
    !agent.paused &&
    agent.platform === "CHATGPT" &&
    !agent.oauthClientId;
  const state = agent.paused ? "paused" : waiting ? "waiting" : "active";
  return (
    <li className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{agent.displayName}</span>
        <span className={state === "active" ? "text-xs text-allow" : "text-xs text-wait"}>
          {t(`status.${state}`)}
        </span>
      </div>
      {agent.mcpUrl && <CopyField label={t("mcpUrl")} value={agent.mcpUrl} />}
      {waiting && agent.pendingClientId && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{t("confirmHint", { client: agent.pendingClientId })}</span>
          <Button
            type="button"
            variant="primary"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate({ id: agent.id, clientId: agent.pendingClientId! })}
          >
            {t("confirm")}
          </Button>
        </div>
      )}
      <div>
        <Button
          type="button"
          variant="destructive"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate({ id: agent.id, reason: t("disconnectReason") })}
        >
          {t("disconnect")}
        </Button>
      </div>
    </li>
  );
}

/**
 * Connect a cloud agent: ChatGPT, Claude or Copilot Studio, with the steps for each. The plan's
 * cloud agent limit shows as the shared PlanLimitNotice before the form (and from the 403, if a
 * parallel request got there first). Agents over the limit show as paused, never as deleted.
 */
export function CloudAgentsPanel() {
  const t = useTranslations("cloudAgents");
  const list = useCloudAgents();
  const connect = useConnectCloudAgent();
  const [provider, setProvider] = useState<CloudProvider>("claude");
  const [name, setName] = useState("");
  const [result, setResult] = useState<{
    provider: CloudProvider;
    data: ConnectedCloudAgent;
  } | null>(null);

  if (list.isLoading) return <Skeleton className="h-24 w-full" aria-busy />;
  if (list.isError || !list.data) {
    return (
      <p role="alert" className="text-sm text-deny">
        {t("unavailable")}
      </p>
    );
  }
  const { items, limit, chatGptAvailable } = list.data;
  const atLimit = limit.max !== null && limit.used >= limit.max;
  const refused: PlanLimitPayload | null = isPlanLimitPayload(connect.error)
    ? connect.error
    : atLimit
      ? {
          code: "plan_limit_reached",
          limit: "cloudAgents",
          current: limit.used,
          max: limit.max ?? 0,
        }
      : null;
  const chatGptOff = provider === "chatgpt" && !chatGptAvailable;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {limit.max === null
          ? t("usageUnlimited", { used: limit.used })
          : t("usage", { used: limit.used, max: limit.max })}
      </p>

      {result ? (
        <ConnectResult
          provider={result.provider}
          result={result.data}
          onDone={() => setResult(null)}
        />
      ) : refused ? (
        <PlanLimitNotice error={refused} />
      ) : (
        <form
          className="grid gap-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const displayName = name.trim();
            if (!displayName || chatGptOff) return;
            const p = CLOUD_PROVIDERS[provider];
            connect.mutate(
              {
                slug: agentSlug(displayName),
                displayName,
                platform: p.platform,
                redirectUris: p.redirectUris,
                task: standingTask(displayName),
              },
              { onSuccess: (data) => (setResult({ provider, data }), setName("")) },
            );
          }}
        >
          <h3 className="text-base font-medium">{t("open")}</h3>
          <Tabs value={provider} onValueChange={(v) => setProvider(v as CloudProvider)}>
            <TabsList>
              {PROVIDERS.map((p) => (
                <TabsTrigger key={p} value={p}>
                  {t(`providers.${p}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {chatGptOff && <p className="text-sm text-wait">{t("providers.chatgptOff")}</p>}
          <div className="grid gap-1">
            <Label htmlFor="cloud-agent-name">{t("form.name")}</Label>
            <Input
              id="cloud-agent-name"
              value={name}
              maxLength={80}
              placeholder={t("form.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {connect.isError && !isPlanLimitPayload(connect.error) && (
            <p role="alert" className="text-sm text-deny">
              {t("form.failed")}
            </p>
          )}
          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || chatGptOff || connect.isPending}
            >
              {connect.isPending ? t("form.working") : t("form.submit")}
            </Button>
          </div>
        </form>
      )}

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-medium">{t("connected")}</h3>
        {items.length === 0 ? (
          <EmptyState icon={CloudIcon} description={t("none")} />
        ) : (
          <ul className="grid gap-3">
            {items.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
