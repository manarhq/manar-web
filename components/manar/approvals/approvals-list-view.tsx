"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { StatusBadge } from "@/components/manar/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useApprovalHistory,
  useEndStanding,
  useRevokeApproval,
  type HistoryItem,
  type HistoryStatus,
} from "@/hooks/use-approval-history";
import { conflictKey, serverMessage } from "@/lib/approvals/conflict";
import { historyState, liveStanding } from "@/lib/approvals/history-state";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import { toolDisplayName } from "@/lib/personal/tool-stats";

const STATUSES: HistoryStatus[] = ["PENDING", "APPROVED", "DENIED", "EXPIRED", "REVOKED"];

/**
 * Approval history (3 Nov 2026): agent and device approvals together, every state in plain words,
 * who decided, when and how, whether the device or agent had received it, what standing permission
 * it left, and the actions a person may take: Revoke, withdraw an 8-hour approval or a site rule,
 * lift a block. Opens on "All", not on pending.
 */
export function ApprovalsListView() {
  const t = useTranslations("approvals.history");
  const tCommon = useTranslations("common.actions");
  const [status, setStatus] = useState<HistoryStatus | "ALL">("ALL");
  const [revoking, setRevoking] = useState<HistoryItem | null>(null);
  const query = useApprovalHistory(status === "ALL" ? undefined : status);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const seesAll = query.data?.pages[0]?.seesAll ?? false;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={seesAll ? t("descriptionAll") : t("descriptionOwn")}
      />
      <Select
        value={status}
        onValueChange={(v) => setStatus((v as HistoryStatus | "ALL") ?? "ALL")}
      >
        <SelectTrigger className="w-60" aria-label={t("filterLabel")}>
          <SelectValue placeholder={t("filterLabel")}>
            {(v: HistoryStatus | "ALL" | null) => (v ? t(`filter.${v}`) : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(["ALL", ...STATUSES] as const).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`filter.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {query.isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-destructive">
          {t("loadError")}
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardTextIcon} description={t("empty")} />
      ) : (
        <ul className="grid gap-2" data-testid="approval-history">
          {items.map((item) => (
            <HistoryRow
              key={`${item.kind}-${item.id}`}
              item={item}
              seesAll={seesAll}
              onRevoke={() => setRevoking(item)}
            />
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {tCommon("loadMore")}
        </Button>
      )}
      <RevokeDialog item={revoking} onClose={() => setRevoking(null)} />
    </div>
  );
}

function HistoryRow({
  item,
  seesAll,
  onRevoke,
}: {
  item: HistoryItem;
  seesAll: boolean;
  onRevoke: () => void;
}) {
  const t = useTranslations("approvals.history");
  const format = useFormatter();
  const end = useEndStanding();
  const state = historyState(item);
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const what = cleanAgentText(item.resource, 120);
  const action = cleanAgentText(item.actionId, 80);
  const name = cleanAgentText(item.source.name, 80);
  const isolate = (chunks: ReactNode) => <bdi>{chunks}</bdi>;
  const source =
    item.source.type === "device"
      ? t.rich("onDevice", {
          tool: toolDisplayName(item.toolId),
          device: name.text,
          t: isolate,
          d: isolate,
        })
      : t.rich("byAgent", { agent: name.text, a: isolate });
  const flagged = what.flagged || action.flagged || name.flagged;

  const endStanding = (s: HistoryItem["standing"][number]) =>
    end.mutate(
      { kind: s.kind, id: s.id },
      {
        onSuccess: () =>
          toast.success(
            t(s.kind === "block" || s.mode === "DENY" ? "liftedToast" : "withdrawnToast"),
          ),
        onError: (e) =>
          toast.error(
            conflictKey(e) === "forbidden"
              ? (serverMessage(e) ?? t("notAllowed"))
              : t("actionFailed"),
          ),
      },
    );

  return (
    <li className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-0.5">
          <span className="font-medium text-foreground">
            {source}: <bdi>{action.text}</bdi> <bdi className="font-mono">{what.text}</bdi>
          </span>
          <span className="text-xs text-muted-foreground">{when(item.requestedAt)}</span>
          {flagged && (
            <span role="note" className="text-xs font-medium text-deny">
              {t("hiddenCharacters")}
            </span>
          )}
        </div>
        <StatusBadge tone={state.tone}>{t(`state.${state.key}`)}</StatusBadge>
      </div>

      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
        {item.decidedAt && (
          <>
            <dt className="text-muted-foreground">{t("decided")}</dt>
            <dd>
              {t("decidedBy", {
                name: item.decidedByName
                  ? cleanAgentText(item.decidedByName, 80).text
                  : t("someone"),
                via: t(`via.${item.decidedVia ?? "console"}`),
                when: when(item.decidedAt),
              })}
              {item.reason ? ` · ${item.reason}` : ""}
            </dd>
          </>
        )}
        {item.endReason && (
          <>
            <dt className="text-muted-foreground">{t("why")}</dt>
            <dd>{t.has(`end.${item.endReason}`) ? t(`end.${item.endReason}`) : item.endReason}</dd>
          </>
        )}
        {(item.status === "APPROVED" || item.status === "REVOKED") && (
          <>
            <dt className="text-muted-foreground">{t("use")}</dt>
            <dd>{item.usedAt ? t("usedAt", { when: when(item.usedAt) }) : t("notUsed")}</dd>
          </>
        )}
        {item.revokedAt && (
          <>
            <dt className="text-muted-foreground">{t("revoked")}</dt>
            <dd>
              {t("revokedBy", {
                name: item.revokedByName
                  ? cleanAgentText(item.revokedByName, 80).text
                  : t("someone"),
                when: when(item.revokedAt),
              })}
              {item.revokeNote ? (
                <>
                  {" · "}
                  <bdi>{cleanAgentText(item.revokeNote, 200).text}</bdi>
                </>
              ) : null}
            </dd>
          </>
        )}
      </dl>

      {(item.canRevoke || (seesAll && liveStanding(item).length > 0) || item.kind === "agent") && (
        <div className="flex flex-wrap items-center gap-2">
          {item.kind === "agent" && (
            <Link href={`/approvals/${item.id}`} className="link-text text-xs">
              {t("openDetails")}
            </Link>
          )}
          {seesAll &&
            liveStanding(item).map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="outline"
                disabled={end.isPending}
                onClick={() => endStanding(s)}
              >
                {s.kind === "block" || s.mode === "DENY"
                  ? t("liftBlock")
                  : s.kind === "site_rule"
                    ? t("withdrawSiteRule", {
                        until: s.expiresAt ? when(s.expiresAt) : t("always"),
                      })
                    : t("withdraw8h", { until: when(s.expiresAt!) })}
              </Button>
            ))}
          {item.canRevoke && (
            <Button
              size="sm"
              variant="outline"
              className="ms-auto border-deny text-deny"
              onClick={onRevoke}
            >
              {t("revoke")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** Says exactly what Revoke will do before it does it: cancel (nothing ran) or flag (it may have). */
export function RevokeDialog({
  item,
  onClose,
}: {
  item: Pick<HistoryItem, "kind" | "id" | "usedAt"> | null;
  onClose: () => void;
}) {
  const t = useTranslations("approvals.history");
  const tc = useTranslations("approvals.conflict");
  const revoke = useRevokeApproval();
  const [note, setNote] = useState("");
  const used = item?.usedAt != null;

  const confirm = () => {
    if (!item) return;
    revoke.mutate(
      { kind: item.kind, id: item.id, note: note.trim() || undefined },
      {
        onSuccess: (r) => {
          toast.success(r.usedBeforeRevoke ? t("revokedAfterUseToast") : t("cancelledToast"));
          setNote("");
          onClose();
        },
        onError: (e) => {
          const key = conflictKey(e);
          toast.error(key === "forbidden" ? (serverMessage(e) ?? t("notAllowed")) : tc(key));
        },
      },
    );
  };

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("revokeTitle")}</DialogTitle>
          <DialogDescription>{used ? t("revokeUsed") : t("revokeUnused")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="revoke-note">{t("noteLabel")}</Label>
          <Textarea
            id="revoke-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            {t("keep")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-deny text-deny"
            disabled={revoke.isPending}
            onClick={confirm}
          >
            {used ? t("confirmRevokeUsed") : t("confirmRevokeUnused")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
