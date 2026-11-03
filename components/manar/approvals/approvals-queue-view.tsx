"use client";

import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueApproval } from "@/hooks/use-answer-approval";
import { ApprovalCard } from "@/components/manar/approvals/approval-card";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import { usePendingApprovals } from "@/hooks/use-pending-approvals-count";
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
                  {item.actionId} <bdi>{cleanAgentText(item.resource, 80).text}</bdi>
                </span>
                {item.hostName && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.hostName}
                  </span>
                )}
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
  const format = useFormatter();
  return (
    <section
      aria-labelledby="ctx-title"
      data-testid="context-panel"
      className="relative grid content-start gap-3 overflow-hidden rounded-xl border border-border bg-card py-4 ps-6 pe-5"
    >
      <span aria-hidden className="absolute inset-y-0 start-0 w-[5px] bg-orange" />
      <ApprovalCard approval={approval} onNext={onNext} onPrev={onPrev} titleId="ctx-title" />
      <p className="text-xs text-muted-foreground">
        {t("expires")} {format.dateTime(new Date(approval.expiresAt), { timeStyle: "short" })} ·{" "}
        {t("keys")}
      </p>
    </section>
  );
}
