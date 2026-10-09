"use client";

import { useState } from "react";
import { CopyIcon, EyeIcon, EyeSlashIcon, KeyIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";

/** Actions whose execution leaves a one-time value for the approving person (manar-api ADR-0011). */
export const HANDOVER_ACTIONS: ReadonlySet<string> = new Set([
  "entra.user.password.reset",
  "entra.user.create",
]);

export interface ApprovalHandoverProps {
  approvalId: string;
  /** The approved action's name, or null when it could not be resolved. */
  actionName: string | null;
  /** Manar user id of the person who approved, from the request's decisions. */
  approverUserId: string | null;
  /** Manar user id of the person viewing this page, or null when unknown. */
  viewerUserId: string | null;
}

type Outcome =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "shown"; fields: Array<[string, string]> }
  | { kind: "gone" }
  | { kind: "forbidden" }
  | { kind: "unavailable" };

/**
 * "Show temporary password" for the person who approved a password reset or account
 * creation. The value is fetched once with a plain call (not React Query, so it never
 * sits in a cache), kept only in this component's state, and dropped when the page is
 * left. manar-api deletes it on the first read; a second read is a 404.
 */
export function ApprovalHandover({
  approvalId,
  actionName,
  approverUserId,
  viewerUserId,
}: ApprovalHandoverProps) {
  const t = useTranslations("approvals.handover");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!actionName || !HANDOVER_ACTIONS.has(actionName)) return null;
  if (!approverUserId || !viewerUserId || approverUserId !== viewerUserId) return null;

  async function collect() {
    setOutcome({ kind: "loading" });
    try {
      const { data, response } = await apiClient.POST("/approvals/{id}/handover", {
        params: { path: { id: approvalId } },
      });
      // manar-api documents the 200 body only in prose (`{ approvalRequestId, value }`), so
      // the generated type is empty; openapi-fetch still parses the JSON body.
      const body = data as unknown as { value?: Record<string, string> } | undefined;
      if (response.ok && body?.value) {
        setOutcome({ kind: "shown", fields: Object.entries(body.value) });
      } else if (response.status === 404) {
        setOutcome({ kind: "gone" });
      } else if (response.status === 403) {
        setOutcome({ kind: "forbidden" });
      } else {
        setOutcome({ kind: "unavailable" });
      }
    } catch {
      setOutcome({ kind: "unavailable" });
    }
  }

  async function copy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section
      aria-labelledby="approval-handover-heading"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 id="approval-handover-heading" className="text-sm font-semibold text-foreground">
        {t("title")}
      </h2>

      {outcome.kind === "shown" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("shownNotice")}</p>
          {outcome.fields.map(([field, value]) => (
            <div key={field} className="flex flex-col gap-2">
              <span className="font-data text-xs text-muted-foreground">{field}</span>
              <div className="flex items-center gap-2">
                <output
                  className="flex h-(--density-control-height) min-w-0 flex-1 items-center rounded-md border border-input bg-subtle px-3 font-data text-sm select-all"
                  aria-label={field}
                  dir="ltr"
                >
                  {revealed ? value : "•".repeat(Math.min(value.length, 16))}
                </output>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setRevealed((r) => !r)}
                  aria-label={revealed ? t("hide") : t("reveal")}
                  aria-pressed={revealed}
                >
                  {revealed ? <EyeSlashIcon /> : <EyeIcon />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => copy(field, value)}
                  aria-label={t("copy")}
                >
                  <CopyIcon />
                </Button>
              </div>
              {copied === field && (
                <span role="status" className="text-xs text-muted-foreground">
                  {t("copied")}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : outcome.kind === "gone" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("gone")}
        </p>
      ) : outcome.kind === "forbidden" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("forbidden")}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
          {outcome.kind === "unavailable" && (
            <p role="alert" className="text-sm text-deny">
              {t("unavailable")}
            </p>
          )}
          <Dialog>
            <DialogTrigger render={<Button disabled={outcome.kind === "loading"} />}>
              <KeyIcon data-icon="inline-start" />
              {t("show")}
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>{t("confirmTitle")}</DialogTitle>
                <DialogDescription>{t("confirmBody")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
                <DialogClose render={<Button />} onClick={collect}>
                  {t("confirm")}
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </section>
  );
}
