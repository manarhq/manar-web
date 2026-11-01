"use client";

import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { RiskBadge } from "@/components/manar/risk-badge";
import { ApprovalExplanation } from "@/components/manar/approvals/approval-explanation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalDetail, type ApprovalChoice } from "@/hooks/use-approvals";
import { useAnswerApproval, type QueueApproval } from "@/hooks/use-answer-approval";
import { usePendingApprovals } from "@/hooks/use-pending-approvals-count";
import { useDecisionKeys } from "@/hooks/use-decision-keys";
import { toolDisplayName } from "@/lib/personal/tool-stats";
import { cn } from "@/lib/utils";

/**
 * Approvals, Midnight style: the queue on the start side, the selected request's context on the
 * other. Keys: J next, K previous, A approve once, D deny (hooks/use-decision-keys.ts keeps them
 * safe: armed 750 ms after a request appears, ignored in fields and dialogs). "Approve for
 * 8 hours" and "Approve + make rule" have no key on purpose.
 */
export function ApprovalsQueueView() {
  const t = useTranslations("approvals.queue");
  const format = useFormatter();
  const pending = usePendingApprovals();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = pending.items;
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === selectedId),
  );
  const selected: QueueApproval | undefined = items[index];

  const move = useCallback(
    (delta: number) => {
      if (!items.length) return;
      setSelectedId(items[(index + delta + items.length) % items.length]!.id);
    },
    [items, index],
  );

  if (pending.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (pending.unavailable) return <p role="alert">{t("loadFailed")}</p>;
  if (!selected) {
    return (
      <div className="grid gap-4">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={ClipboardTextIcon} description={t("empty")} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <ul aria-label={t("queueLabel")} className="grid content-start gap-2" data-testid="queue">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === selected.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full rounded-lg border border-border bg-card p-3 text-start text-sm",
                  "border-s-4 border-s-transparent hover:bg-accent/50",
                  item.id === selected.id && "border-s-orange bg-accent/40",
                )}
              >
                <span className="block font-medium text-foreground">
                  {toolDisplayName(item.toolId)}
                </span>
                <span className="block truncate text-muted-foreground">
                  {item.actionId} {item.resource}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {format.dateTime(new Date(item.requestedAt), { timeStyle: "short" })}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <ContextPanel
          key={selected.id}
          approval={selected}
          onNext={() => move(1)}
          onPrev={() => move(-1)}
        />
      </div>
      <Link href="/settings/notifications" className="link-text text-sm">
        {t("notifications")}
      </Link>
    </div>
  );
}

function ContextPanel({
  approval,
  onNext,
  onPrev,
}: {
  approval: QueueApproval;
  onNext: () => void;
  onPrev: () => void;
}) {
  const t = useTranslations("approvals.queue");
  const tp = useTranslations("personal.approval");
  const format = useFormatter();
  const host = approval.kind === "host";
  // JAIL: a tool wants to reach a site that is not allowed yet.
  const site = host && approval.actionId === "site.connect";
  const detail = useApprovalDetail(host ? "" : approval.id);
  const { answer: send, isPending } = useAnswerApproval(approval);
  const [gone, setGone] = useState(false);

  const answer = useCallback(
    (choice: ApprovalChoice, options: { makeRule?: boolean } = {}) => {
      if (isPending || gone) return;
      send(choice, options).then(
        (r) => {
          if (r.status === "already-decided") toast.message(tp("alreadyDecided"));
          else toast.success(r.approved ? tp("doneApproved") : tp("doneDenied"));
          setGone(true);
        },
        () => toast.error(tp("failed")),
      );
    },
    [send, isPending, gone, tp],
  );

  useDecisionKeys({
    requestId: approval.id,
    onApprove: () => answer("approve_once"),
    onDeny: () => answer("deny"),
    onNext,
    onPrev,
    enabled: !gone,
  });

  const reason = detail.data?.requiredReason;
  const busy = isPending || gone;

  return (
    <section
      aria-labelledby="ctx-title"
      data-testid="context-panel"
      className="relative grid content-start gap-3 overflow-hidden rounded-xl border border-border bg-card py-4 ps-6 pe-5"
    >
      <span aria-hidden className="absolute inset-y-0 start-0 w-[5px] bg-orange" />
      <h2 id="ctx-title" className="text-lg font-medium text-foreground">
        {site
          ? tp("wantsToConnect", {
              tool: toolDisplayName(approval.toolId),
              site: approval.resource,
            })
          : tp("wantsTo", {
              tool: toolDisplayName(approval.toolId),
              action: approval.actionId,
              resource: approval.resource,
            })}
      </h2>
      {reason && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {reason === "policy_requires_approval" ? tp("reasonPolicy") : tp("reasonRisk")}
        </p>
      )}
      <ApprovalExplanation approval={approval} />
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("source")}</dt>
        <dd>{host ? t("sourceDevice") : t("sourceAgent")}</dd>
        {!host && (
          <>
            <dt className="text-muted-foreground">{t("risk")}</dt>
            <dd>
              <RiskBadge score={approval.riskScore} />
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("expires")}</dt>
        <dd>{format.dateTime(new Date(approval.expiresAt), { timeStyle: "short" })}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy} onClick={() => answer("approve_once")}>
          {tp("approveOnce")} <kbd className="kbd">A</kbd>
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => answer("approve_8h")}>
          {tp("approve8h")}
        </Button>
        {site ? (
          <Button variant="secondary" disabled={busy} onClick={() => answer("approve_always")}>
            {tp("approveAlways")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => answer("approve_once", { makeRule: true })}
          >
            {tp("makeRule")}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => answer("deny")}
          className="border-deny text-deny hover:bg-deny-soft"
        >
          {tp("deny")} <kbd className="kbd">D</kbd>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("keys")}</p>
    </section>
  );
}
