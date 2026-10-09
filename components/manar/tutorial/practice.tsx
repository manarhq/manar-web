"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FlaskIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PracticeKind } from "./engine";

/**
 * Client-side practice sandboxes for the tour. Nothing in this file calls
 * the API, so a practice approval or kill switch can never reach a real
 * agent, tool or tenant. The fixed outcomes below mirror the decision
 * vocabulary and reason codes manar-api uses (authorization.service.ts,
 * kill-switch.service.ts); they are copy, not a second decision engine.
 */

type Outcome = "ALLOW" | "APPROVAL_REQUIRED" | "DENY";

const OUTCOME_BADGE = { ALLOW: "allow", APPROVAL_REQUIRED: "wait", DENY: "deny" } as const;

const REQUESTS = [
  { key: "signins", action: "entra.user.signins.list", outcome: "ALLOW", reason: "allow" },
  {
    key: "disable",
    action: "entra.user.disable",
    outcome: "APPROVAL_REQUIRED",
    reason: "approval",
  },
  { key: "reset", action: "entra.user.password.reset", outcome: "DENY", reason: "deny" },
] as const;

const PRACTICE_POLICY_VERSION = "practice-v3";

export function PracticeBanner() {
  const t = useTranslations("tutorial.practice");
  return (
    <div
      role="note"
      data-testid="practice-banner"
      className="flex items-start gap-2 rounded-md border border-wait bg-wait-soft px-3 py-2 text-xs text-foreground"
    >
      <FlaskIcon className="mt-0.5 size-4 shrink-0 text-wait" aria-hidden />
      <span>
        <span className="me-1 font-mono font-medium text-wait">{t("fixture")}</span>
        {t("banner")}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const t = useTranslations("tutorial.practice.outcomes");
  return (
    <Badge variant={OUTCOME_BADGE[outcome]} className="font-mono">
      {t(outcome)}
    </Badge>
  );
}

function AgentFields() {
  const t = useTranslations("tutorial.practice");
  return (
    <>
      <Field label={t("agent")}>
        <span className="font-mono">{t("agentName")}</span>
      </Field>
      <Field label={t("task")}>{t("taskName")}</Field>
    </>
  );
}

function DecisionPractice({ onDone }: { onDone: () => void }) {
  const t = useTranslations("tutorial.practice");
  const [picked, setPicked] = useState<(typeof REQUESTS)[number] | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("decision.prompt")}</p>
      <ul className="flex flex-col gap-2">
        {REQUESTS.map((request) => (
          <li key={request.key} className="flex items-center justify-between gap-2">
            <span className="min-w-0 text-xs">
              <span className="block font-mono">{request.action}</span>
              <span className="block text-muted-foreground">
                {t(`decision.requests.${request.key}`)}
              </span>
            </span>
            <Button
              size="sm"
              variant="secondary"
              aria-pressed={picked?.key === request.key}
              onClick={() => {
                setPicked(request);
                onDone();
              }}
            >
              {t("decision.send")}
            </Button>
          </li>
        ))}
      </ul>
      {picked && (
        <dl aria-live="polite" className="flex flex-col gap-1 border-t border-border pt-3">
          <AgentFields />
          <Field label={t("action")}>
            <span className="font-mono">{picked.action}</span>
          </Field>
          <Field label={t("decisionLabel")}>
            <OutcomeBadge outcome={picked.outcome} />
          </Field>
          <Field label={t("reason")}>{t(`decision.reasons.${picked.reason}`)}</Field>
          <Field label={t("policyVersion")}>
            <span className="font-mono">{PRACTICE_POLICY_VERSION}</span>
          </Field>
        </dl>
      )}
    </div>
  );
}

function ApprovalPractice({ onDone }: { onDone: () => void }) {
  const t = useTranslations("tutorial.practice");
  const [choice, setChoice] = useState<"approved" | "denied" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("approval.prompt")}</p>
      <dl className="flex flex-col gap-1">
        <AgentFields />
        <Field label={t("action")}>
          <span className="font-mono">entra.user.disable</span>
        </Field>
        <Field label={t("target")}>
          <span className="font-mono">{t("approval.targetValue")}</span>
        </Field>
        <Field label={t("reason")}>{t("approval.reasonValue")}</Field>
      </dl>
      {choice ? (
        <div aria-live="polite" className="flex flex-col gap-2 border-t border-border pt-3">
          <Badge variant={choice === "approved" ? "allow" : "deny"}>
            {t(`approval.${choice}Badge`)}
          </Badge>
          <p className="text-xs">{t(`approval.${choice}`)}</p>
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setChoice(null)}>
            {t("approval.again")}
          </Button>
        </div>
      ) : (
        // Fitts: 36px targets, destructive kept 16px away from the safe action.
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setChoice("approved");
              onDone();
            }}
          >
            {t("approval.approve")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setChoice("denied");
              onDone();
            }}
          >
            {t("approval.deny")}
          </Button>
        </div>
      )}
    </div>
  );
}

function KillSwitchPractice({ onDone }: { onDone: () => void }) {
  const t = useTranslations("tutorial.practice");
  const [on, setOn] = useState(false);
  const [pulledOnce, setPulledOnce] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("killSwitch.prompt")}</p>
      <dl className="flex flex-col gap-1">
        <AgentFields />
        <Field label={t("killSwitch.state")}>
          <Badge variant={on ? "deny" : "allow"}>
            {t(on ? "killSwitch.on" : "killSwitch.off")}
          </Badge>
        </Field>
      </dl>
      {on ? (
        <Button
          className="self-start"
          onClick={() => {
            setOn(false);
            onDone();
          }}
        >
          {t("killSwitch.release")}
        </Button>
      ) : (
        <Button
          variant="destructive"
          className="self-start"
          onClick={() => {
            setOn(true);
            setPulledOnce(true);
          }}
        >
          {t("killSwitch.pull")}
        </Button>
      )}
      {pulledOnce && (
        <p aria-live="polite" className="text-xs">
          {t(on ? "killSwitch.pulled" : "killSwitch.released")}
        </p>
      )}
    </div>
  );
}

export function Practice({ kind, onDone }: { kind: PracticeKind; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-3" data-tour-practice={kind}>
      <PracticeBanner />
      {kind === "decision" && <DecisionPractice onDone={onDone} />}
      {kind === "approval" && <ApprovalPractice onDone={onDone} />}
      {kind === "killswitch" && <KillSwitchPractice onDone={onDone} />}
    </div>
  );
}
