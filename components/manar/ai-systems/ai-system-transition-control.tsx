"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon, LockIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiSystemLifecycleBadge } from "@/components/manar/ai-systems/ai-system-lifecycle-badge";
import {
  allowedTransitions,
  classifyTransitionFailure,
  isTerminal,
  requiresSecondReviewer,
} from "@/components/manar/ai-systems/lifecycle";
import { useTransitionAiSystem, type AiSystemLifecycleState } from "@/hooks/use-ai-systems";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

/**
 * `POST /ai-systems/:id/transitions` — the only path that changes
 * lifecycle state, so this is the only control in the console that can.
 *
 * Two deliberate behaviours:
 *
 * 1. **Only legal target states are offered.** The picker is built from
 *    the server's own allowed-edge table (mirrored in `./lifecycle.ts`),
 *    so the UI never invites a move the backend would reject.
 * 2. **The rejections are told apart.** A 409 (not an allowed edge from
 *    the current state — in practice, the record moved underneath this
 *    page) and a 403 read as different problems with different remedies,
 *    and a separation-of-duties 403 says plainly that a *different
 *    authorized reviewer* is needed rather than "forbidden": the operator
 *    is not lacking permission, they are the wrong person for this
 *    particular step.
 */
export function AiSystemTransitionControl({
  aiSystemId,
  currentState,
  canManage,
}: {
  aiSystemId: string;
  currentState: AiSystemLifecycleState;
  canManage: boolean;
}) {
  const t = useTranslations("aiSystems.transition");
  const tStates = useTranslations("aiSystems.lifecycleState");
  const [toState, setToState] = useState<AiSystemLifecycleState | "">("");
  const [reason, setReason] = useState("");
  const transition = useTransitionAiSystem(aiSystemId);

  const targets = allowedTransitions(currentState);
  const secondReviewerNeeded = toState !== "" && requiresSecondReviewer(currentState, toState);

  const failure =
    transition.isError && toState !== ""
      ? classifyTransitionFailure({
          status: apiErrorStatus(transition.error),
          message: apiErrorMessage(transition.error, ""),
          from: currentState,
          to: toState,
          callerCanManage: canManage,
        })
      : null;

  const canSubmit = toState !== "" && reason.trim().length > 0 && !transition.isPending;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <span className="text-xs text-muted-foreground">{t("currentState")}</span>
        <AiSystemLifecycleBadge state={currentState} />
      </div>

      {isTerminal(currentState) ? (
        <p className="max-w-prose text-sm text-muted-foreground">{t("terminal")}</p>
      ) : !canManage ? (
        <p className="flex max-w-prose items-start gap-2 text-sm text-muted-foreground">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("readOnly")}
        </p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            // `canSubmit` already asserts a target state was picked, so
            // TypeScript narrows `toState` past the empty-string
            // placeholder here.
            if (!canSubmit) return;
            transition.mutate(
              { toState, reason: reason.trim() },
              {
                onSuccess: () => {
                  toast.success(t("success", { state: tStates(toState) }));
                  setToState("");
                  setReason("");
                },
              },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-system-transition-target">{t("chooseTarget")}</Label>
            <Select
              value={toState}
              onValueChange={(value) => setToState((value as AiSystemLifecycleState) ?? "")}
            >
              <SelectTrigger id="ai-system-transition-target" className="w-56">
                {/* Base UI renders the raw enum value without a render
                 * function — map it back to the translated label. */}
                <SelectValue placeholder={t("chooseTargetPlaceholder")}>
                  {(value: AiSystemLifecycleState | null) => (value ? tStates(value) : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {targets.map((state) => (
                  <SelectItem key={state} value={state}>
                    {tStates(state)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {secondReviewerNeeded && (
            <p className="flex max-w-prose items-start gap-2 text-xs text-muted-foreground">
              <UsersIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              {t("secondReviewerNote")}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-system-transition-reason">{t("reasonLabel")}</Label>
            <Textarea
              id="ai-system-transition-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={2000}
            />
            <span className="text-xs text-muted-foreground">{t("reasonHint")}</span>
          </div>

          {failure && (
            <div
              role="alert"
              data-slot="transition-error"
              data-transition-failure={failure}
              className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
            >
              <p className="max-w-prose text-sm text-destructive">{t(`errors.${failure}`)}</p>
              {/* The server's own sentence, kept as secondary detail so a
               * responder can quote it — never as the primary message. */}
              <p className="font-data text-2xs text-muted-foreground-tertiary">
                {apiErrorMessage(transition.error)}
              </p>
            </div>
          )}

          <Button type="submit" size="sm" className="w-fit" disabled={!canSubmit}>
            {/* Forward-progress cue, mirrored in RTL like every other
             * directional arrow in this console. */}
            <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
            {transition.isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </section>
  );
}
