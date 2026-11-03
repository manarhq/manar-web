import type { StatusTone } from "@/components/manar/status-badge";
import type { HistoryItem } from "@/hooks/use-approval-history";

/**
 * The plain state of an approval, as a key under `approvals.history.state` and a badge tone.
 * Every stored state has its own words: an approval is never just "Approved" when it was revoked
 * after use, nor "Denied" when nobody answered or Manar refused it on re-checking.
 */
export function historyState(item: HistoryItem): { key: string; tone: StatusTone } {
  switch (item.status) {
    case "PENDING":
      return { key: "pending", tone: "warning" };
    case "APPROVED":
      return {
        key:
          item.decision === "approve_8h"
            ? "approved8h"
            : item.decision === "approve_always"
              ? "approvedAlways"
              : "approvedOnce",
        tone: "positive",
      };
    case "DENIED":
      // A person said yes, but Manar re-checked and refused (the task ended, the policy changed).
      return item.endReason
        ? { key: "refusedByManar", tone: "negative" }
        : { key: "denied", tone: "negative" };
    case "EXPIRED":
      return {
        key:
          item.endReason === "withdrawn"
            ? "noAnswerDevice"
            : item.endReason === "paused"
              ? "withdrawnPaused"
              : item.endReason === "superseded"
                ? "superseded"
                : item.endReason === "no_workflow"
                  ? "couldNotOpen"
                  : "noAnswer",
        tone: "neutral",
      };
    case "REVOKED":
      return item.usedBeforeRevoke
        ? { key: "revokedAfterUse", tone: "negative" }
        : { key: "cancelledBeforeUse", tone: "neutral" };
  }
}

/** A standing permission or block that is still in force. */
export function liveStanding(item: HistoryItem, now = Date.now()) {
  return item.standing.filter(
    (s) => !s.revokedAt && (s.expiresAt === null || new Date(s.expiresAt).getTime() > now),
  );
}
