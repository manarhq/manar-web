"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { ApiErrorState } from "@/components/manar/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAddEgressRule,
  useAgentEdge,
  useEgressDecisions,
  useEgressRules,
  useRemoveEgressRule,
} from "@/hooks/use-edge";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED_TLDS = new Set([
  "local",
  "internal",
  "localhost",
  "onion",
  "arpa",
  "test",
  "invalid",
  "alt",
]);

/**
 * The syntax half of manar-api's `normalizeEgressHost` (src/edge/edge-net.ts): trimmed and
 * lowercased, a DNS name or `*.` + a DNS name of two labels or more, at most 253 characters, no
 * special-use TLD, no all-digit TLD. Returns the normalized host or null.
 * ponytail: the ICANN-TLD and public-suffix checks stay server-side (the list is 200 KB); the
 * API's 400 message is shown for those.
 */
export function checkEgressHost(input: string): string | null {
  const host = input.trim().toLowerCase();
  if (host.length === 0 || host.length > 253) return null;
  const labels = (host.startsWith("*.") ? host.slice(2) : host).split(".");
  if (labels.length < 2 || !labels.every((label) => LABEL.test(label))) return null;
  const tld = labels[labels.length - 1]!;
  if (RESERVED_TLDS.has(tld) || /^[0-9]+$/.test(tld)) return null;
  return host;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="font-data text-xs break-all">
      {children}
    </span>
  );
}

function useWhen() {
  const format = useFormatter();
  return (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
}

function EdgeStatus({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.network");
  const when = useWhen();
  const query = useAgentEdge(agentId, true);

  if (query.isPending) return <Skeleton className="h-16 w-full" />;
  if (query.isError) return <ApiErrorState error={query.error} onRetry={() => query.refetch()} />;
  const edge = query.data;
  if (!edge.enrolled) {
    return (
      <div className="flex flex-col gap-2">
        <Badge variant="neutral" className="w-fit">
          {t("notOnEdge")}
        </Badge>
        <p className="text-sm text-muted-foreground">{t("notOnEdgeBody")}</p>
      </div>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Field
        label={t("state")}
        value={
          edge.state === "active" ? (
            <Badge variant="allow">{t("active")}</Badge>
          ) : edge.state === "cut" ? (
            <Badge variant="deny">{t("cut")}</Badge>
          ) : (
            <Badge variant="neutral">{t("notReported")}</Badge>
          )
        }
      />
      <Field
        label={t("address")}
        value={
          edge.address ? (
            <Code>{edge.address}</Code>
          ) : (
            <span className="text-muted-foreground">{t("notReported")}</span>
          )
        }
      />
      <Field
        label={t("updatedAt")}
        value={
          edge.updatedAt ? (
            when(edge.updatedAt)
          ) : (
            <span className="text-muted-foreground">{t("notReported")}</span>
          )
        }
      />
      {edge.state === "cut" && (
        <div className="sm:col-span-3">
          <Field
            label={t("cutReasons")}
            value={
              edge.cutReasons && edge.cutReasons.length > 0 ? (
                <ul className="flex flex-col gap-1" data-testid="cut-reasons">
                  {edge.cutReasons.map((reason) => (
                    <li key={reason}>
                      <Code>{reason}</Code>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">{t("notReported")}</span>
              )
            }
          />
        </div>
      )}
    </dl>
  );
}

function AddRuleForm({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.network");
  const [host, setHost] = useState("");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const add = useAddEgressRule(agentId);

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (add.isPending) return;
        const normalized = checkEgressHost(host);
        setInvalid(normalized === null);
        if (normalized === null) return;
        add.mutate(
          { host: normalized, ...(reason.trim() ? { reason: reason.trim() } : {}) },
          {
            onSuccess: () => {
              setHost("");
              setReason("");
            },
          },
        );
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`egress-host-${agentId}`}>{t("hostLabel")}</Label>
          <Input
            id={`egress-host-${agentId}`}
            dir="ltr"
            value={host}
            maxLength={253}
            placeholder="api.example.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={`egress-host-hint-${agentId}`}
            onChange={(event) => {
              setHost(event.target.value);
              setInvalid(false);
            }}
          />
          <p
            id={`egress-host-hint-${agentId}`}
            className={invalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
          >
            {invalid ? t("hostInvalid") : t("hostHint")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`egress-reason-${agentId}`}>{t("reasonLabel")}</Label>
          <Input
            id={`egress-reason-${agentId}`}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="w-fit" disabled={add.isPending}>
        <PlusIcon aria-hidden />
        {add.isPending ? t("adding") : t("add")}
      </Button>
      {add.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorStatus(add.error) === 409 ? t("duplicate") : apiErrorMessage(add.error)}
        </p>
      )}
    </form>
  );
}

function AllowList({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.network");
  const when = useWhen();
  const rules = useEgressRules(agentId, true);
  const remove = useRemoveEgressRule(agentId);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("allowListBody")}</p>
      {rules.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : rules.isError ? (
        <ApiErrorState error={rules.error} onRetry={() => rules.refetch()} />
      ) : rules.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("allowListEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("host")}</TableHead>
              <TableHead>{t("reasonLabel")}</TableHead>
              <TableHead>{t("addedAt")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.data.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Code>{rule.host}</Code>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {rule.reason ?? <span className="text-muted-foreground">{t("noReason")}</span>}
                </TableCell>
                <TableCell>{when(rule.createdAt)}</TableCell>
                <TableCell className="text-end">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("remove", { host: rule.host })}
                    disabled={remove.isPending && remove.variables === rule.id}
                    onClick={() => remove.mutate(rule.id)}
                  >
                    <TrashIcon aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {remove.isError && apiErrorStatus(remove.error) !== 404 && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(remove.error)}
        </p>
      )}
      <AddRuleForm agentId={agentId} />
    </div>
  );
}

function EgressDecisions({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.network");
  const when = useWhen();
  const query = useEgressDecisions(agentId, true);

  if (query.isPending) return <Skeleton className="h-20 w-full" />;
  if (query.isError) return <ApiErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("decisionsEmpty")}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("time")}</TableHead>
          <TableHead>{t("decision")}</TableHead>
          <TableHead>{t("destination")}</TableHead>
          <TableHead>{t("decisionReason")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {query.data.map((event) => {
          const data = event.data as { host?: unknown; port?: unknown; reason?: unknown };
          const host = typeof data.host === "string" ? data.host : null;
          const port = typeof data.port === "number" ? data.port : null;
          const reason = typeof data.reason === "string" ? data.reason : null;
          return (
            <TableRow key={event.eventId}>
              <TableCell>
                <Link
                  href={`/audit/${event.eventId}`}
                  className="underline decoration-line-strong underline-offset-4 hover:decoration-current"
                >
                  {when(event.timestamp)}
                </Link>
              </TableCell>
              <TableCell>
                {event.eventType === "agent.egress.allowed" ? (
                  <Badge variant="allow">{t("allowed")}</Badge>
                ) : (
                  <Badge variant="deny">{t("denied")}</Badge>
                )}
              </TableCell>
              <TableCell>
                {host ? (
                  <Code>{port === null ? host : `${host}:${port}`}</Code>
                ) : (
                  <span className="text-muted-foreground">{t("notReported")}</span>
                )}
              </TableCell>
              <TableCell>
                {reason ? (
                  <Code>{reason}</Code>
                ) : (
                  <span className="text-muted-foreground">{t("notReported")}</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * The agent's Manar edge (manar-edge docs/design.md section 4): peer status as manar-api last
 * wrote it, the egress allow-list and the newest gateway decisions. manar-api serves all three
 * to Security Admins and Tenant Owners only; other roles get a note, never an "all clear".
 */
export function AgentNetworkPanel({ agentId, canManage }: { agentId: string; canManage: boolean }) {
  const t = useTranslations("agents.network");
  if (!canManage) {
    return <p className="text-sm text-muted-foreground">{t("roleNote")}</p>;
  }
  return (
    <section
      aria-labelledby={`network-title-${agentId}`}
      className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4"
    >
      <h2 id={`network-title-${agentId}`} className="text-sm font-semibold text-foreground">
        {t("title")}
      </h2>
      <EdgeStatus agentId={agentId} />
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">{t("allowListTitle")}</h3>
        <AllowList agentId={agentId} />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">{t("decisionsTitle")}</h3>
        <EgressDecisions agentId={agentId} />
      </div>
    </section>
  );
}
