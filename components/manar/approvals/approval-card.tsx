"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { RiskBadge } from "@/components/manar/risk-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useApprovalDetail, type ApprovalChoice } from "@/hooks/use-approvals";
import { useAnswerApproval, type QueueApproval } from "@/hooks/use-answer-approval";
import { DECISION_KEYS_ARM_MS, useDecisionKeys } from "@/hooks/use-decision-keys";
import { actionVerb } from "@/lib/approvals/sentence";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import { startReauth } from "@/lib/auth/start-reauth";
import { toolDisplayName } from "@/lib/personal/tool-stats";

/** At most this many parameters are listed on the card; the rest are under "Details". */
const SHOWN_PARAMS = 6;

/** Agent-written text: cleaned (see safe-text.ts) and isolated so it cannot reorder the sentence. */
function Agent({ value, max }: { value: string; max?: number }) {
  return <bdi className="font-mono">{cleanAgentText(value, max).text}</bdi>;
}

function paramLine(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * One pending request, written for a manager (founder decision, 3 Nov 2026):
 * - one sentence: who (the tool or agent, and whose it is), on which device, wants to do what;
 * - "Why we're asking": the reason in plain words, and the risk as a word, an icon and a colour;
 * - the parameters an approval binds to, listed before any approve button can be used (audit
 *   2026-11-03): an agent request cannot be approved here until they have loaded, nor at all here
 *   when they were cut short; then the full request page decides;
 * - "Just this once" first, Deny at the far end; longer answers are secondary and only offered to
 *   people allowed to give them (`allowedDecisions` from manar-api), with a line saying why not.
 * Buttons and keys wait 750 ms after a request appears, so a click meant for the previous one
 * never lands on this one. The answer is held 10 seconds with Undo (lib/approvals/hold.ts).
 */
export function ApprovalCard({
  approval,
  onNext,
  onPrev,
  extendedGrants = true,
  titleId,
}: {
  approval: QueueApproval;
  onNext?: () => void;
  onPrev?: () => void;
  /** Offer 8 hours / always / rule at all (Home hides them behind a feature flag). */
  extendedGrants?: boolean;
  titleId: string;
}) {
  const t = useTranslations("personal.approval");
  const locale = useLocale();
  const format = useFormatter();
  const [renderedAt] = useState(() => Date.now());
  const host = approval.kind === "host";
  const detail = useApprovalDetail(host ? "" : approval.id);
  const { answer } = useAnswerApproval(approval);
  const [armed, setArmed] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), DECISION_KEYS_ARM_MS);
    return () => clearTimeout(timer);
  }, [approval.id]);

  const allowed: ApprovalChoice[] = approval.allowedDecisions ?? [
    "approve_once",
    "approve_8h",
    ...(approval.actionId === "site.connect" ? (["approve_always"] as const) : []),
    "deny",
  ];
  const params = detail.data?.params as Record<string, unknown> | undefined;
  const truncated = detail.data?.parametersTruncated === true;
  // An agent request binds to its parameters: no approval before they are on screen.
  const paramsShown = host || (detail.data !== undefined && !truncated);
  const may = (c: ApprovalChoice) =>
    allowed.includes(c) &&
    armed &&
    !sent &&
    (c === "deny" || (paramsShown && !approval.stepUpNeeded));

  const decide = (
    choice: ApprovalChoice,
    options: { makeRule?: boolean; alwaysAllowHere?: boolean } = {},
  ) => {
    if (!may(choice)) return;
    setSent(true);
    answer(choice, options);
  };

  useDecisionKeys({
    requestId: approval.id,
    onApprove: () => decide("approve_once"),
    onDeny: () => decide("deny"),
    onNext,
    onPrev,
    enabled: !sent,
  });

  // Everything below comes from the agent, the device or the tool: cleaned and isolated in <bdi>,
  // through rich-text tags, so no value can flip or disguise the sentence (in either language).
  const resource = cleanAgentText(approval.resource, 160);
  const who = cleanAgentText(
    host
      ? toolDisplayName(approval.toolId)
      : (approval.agentName ?? toolDisplayName(approval.toolId)),
    80,
  );
  const owner = cleanAgentText(approval.ownerName ?? "", 80);
  const device = cleanAgentText(approval.hostName ?? "", 80);
  const action = cleanAgentText(approval.actionId, 80);
  const flagged = [resource, who, owner, device, action].some((v) => v.flagged);
  const isolate = (chunks: ReactNode) => <bdi>{chunks}</bdi>;
  const verbKey = actionVerb(approval.actionId);
  const verb =
    verbKey === "other"
      ? t.rich("verbs.other", { action: action.text, act: isolate })
      : t(`verbs.${verbKey}`);
  const sentenceValues = {
    who: who.text,
    owner: owner.text,
    device: device.text,
    resource: resource.text,
  };
  const tags = {
    w: isolate,
    o: isolate,
    d: isolate,
    res: (chunks: ReactNode) => <bdi className="font-mono">{chunks}</bdi>,
    verb: () => verb,
  };
  const sentenceKey = host
    ? approval.ownerName
      ? "sentenceDeviceOwner"
      : approval.hostName
        ? "sentenceDevice"
        : "sentenceTool"
    : approval.ownerName
      ? "sentenceAgentOwner"
      : "sentenceTool";

  const reason = detail.data?.requiredReason;
  const explanation = approval.explanation?.[locale === "ar" ? "ar" : "en"];
  const riskScore = host ? (approval.highRisk ? 70 : 40) : approval.riskScore;
  const extra = extendedGrants
    ? (["approve_8h", "approve_always"] as const).filter((c) => allowed.includes(c))
    : [];
  // "Approve + make rule" is a standing decision too: approvers only, never for a new site.
  const canRule =
    extendedGrants && approval.actionId !== "site.connect" && allowed.includes("approve_8h");
  // A new site where "always" is not offered (a personal owner's own request): a site rule made
  // deliberately in the console replaces it (founder decision, 4 Nov 2026).
  const siteRule =
    extendedGrants &&
    host &&
    approval.actionId === "site.connect" &&
    allowed.includes("approve_8h") &&
    !allowed.includes("approve_always");
  const noApprove = !allowed.some((c) => c !== "deny");
  // Offered once, after the 3rd identical approval, to someone who may give a standing answer
  // (the same rights as 8 hours). Never for high-risk, secret or new-site requests: the API
  // does not send an offer for them.
  const offer =
    extendedGrants && host && approval.ruleOffer && allowed.includes("approve_8h")
      ? approval.ruleOffer
      : null;

  return (
    <div className="grid gap-3" data-testid="approval-card">
      <h2 id={titleId} className="text-lg font-medium text-foreground">
        {t.rich(sentenceKey, {
          who: sentenceValues.who,
          owner: sentenceValues.owner,
          device: sentenceValues.device,
          resource: sentenceValues.resource,
          ...tags,
        })}
      </h2>
      {(flagged || resource.truncated) && (
        <p role="note" className="text-sm font-medium text-deny">
          {flagged ? t("hiddenCharacters") : t("valueCut")}
        </p>
      )}

      <div className="grid gap-1.5 text-sm">
        <p className="flex flex-wrap items-center gap-2 text-foreground">
          <span className="font-medium">{t("whyLabel")}</span>
          <RiskBadge score={riskScore} showScore={!host} />
        </p>
        <p className="max-w-prose text-muted-foreground">
          {host
            ? (explanation ?? t("reasonDevice"))
            : reason === "policy_requires_approval"
              ? t("reasonPolicy")
              : reason
                ? t("reasonRisk")
                : t("reasonLoading")}
        </p>
        {host && <p className="text-xs text-muted-foreground">{t("noAnswerNote")}</p>}
      </div>

      {!host && (
        <section aria-label={t("paramsLabel")} className="grid gap-1 text-sm">
          {detail.data === undefined ? (
            <p className="text-muted-foreground">{t("paramsLoading")}</p>
          ) : params && Object.keys(params).length > 0 ? (
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5">
              {Object.entries(params)
                .slice(0, SHOWN_PARAMS)
                .map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">
                      <Agent value={key} max={60} />
                    </dt>
                    <dd className="truncate">
                      <Agent value={paramLine(value)} max={160} />
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">{t("paramsNone")}</p>
          )}
          {truncated && (
            <p role="note" className="font-medium text-deny">
              {t("paramsCut")}{" "}
              <Link href={`/approvals/${approval.id}`} className="link-text">
                {t("openFull")}
              </Link>
            </p>
          )}
          {detail.data && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">{t("details")}</summary>
              <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-subtle p-2 whitespace-pre-wrap">
                {cleanAgentText(JSON.stringify(params ?? {}, null, 2), 4000).text}
              </pre>
              {detail.data.redactedKeyPaths.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  {t("paramsRedacted", { count: detail.data.redactedKeyPaths.length })}
                </p>
              )}
              <p className="mt-1 break-all text-muted-foreground">
                {t("digest")} <span className="font-mono">{detail.data.parameterDigest}</span>
              </p>
            </details>
          )}
        </section>
      )}
      {host && approval.pointsTo && (
        <p role="note" className="max-w-prose break-all text-sm text-foreground">
          {t.rich("pointsTo", {
            path: cleanAgentText(approval.pointsTo, 300).text,
            res: (chunks) => <bdi className="font-mono">{chunks}</bdi>,
          })}
        </p>
      )}
      {host && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{t("details")}</summary>
          <p className="mt-1 break-all">
            <Agent value={approval.resource} max={2048} />
          </p>
        </details>
      )}

      {approval.why && !approval.needs && (
        <p role="note" className="max-w-prose text-sm text-foreground">
          {approval.stepUpNeeded ? t("stepUpNote", { why: approval.why }) : t("selfConfirmNote")}
        </p>
      )}
      {approval.needs && (
        <p role="note" className="max-w-prose text-sm text-foreground">
          {t(`needs.${approval.needs}`, { why: approval.why ?? "none" })}
        </p>
      )}

      {!noApprove || allowed.includes("deny") ? (
        <div className="flex flex-wrap items-center gap-3">
          {allowed.includes("approve_once") &&
            (approval.stepUpNeeded ? (
              // Own high-risk request (personal workspace): sign in again first, then approve.
              <Button variant="primary" size="lg" onClick={() => startReauth(locale, "/approvals")}>
                {t("stepUpButton")}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={!may("approve_once")}
                onClick={() => decide("approve_once")}
              >
                {t("justOnce")} <kbd className="kbd">A</kbd>
              </Button>
            ))}
          {allowed.includes("deny") && (
            <Button
              variant="outline"
              size="lg"
              disabled={!may("deny")}
              onClick={() => decide("deny")}
              // Far from Approve on purpose: the opposite end of the row, in every direction.
              className="ms-auto border-deny text-deny hover:bg-deny-soft"
            >
              {t("deny")} <kbd className="kbd">D</kbd>
            </Button>
          )}
        </div>
      ) : null}

      {offer && (
        <section
          aria-label={t("offerButton")}
          className="grid gap-2 rounded-lg border border-border bg-subtle p-3"
        >
          <p className="text-sm font-medium text-foreground">
            {t("offerTitle", { count: offer.approvals })}
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t.rich(offer.lastsDays ? "offerBodyUntil" : "offerBody", {
              scope: cleanAgentText(offer.scope, 160).text,
              date: format.dateTime(new Date(renderedAt + (offer.lastsDays ?? 0) * 86_400_000), {
                dateStyle: "medium",
              }),
              res: (chunks: ReactNode) => <bdi className="font-mono">{chunks}</bdi>,
            })}
          </p>
          <div>
            <Button
              variant="secondary"
              size="lg"
              disabled={!may("approve_once")}
              onClick={() => decide("approve_once", { alwaysAllowHere: true })}
            >
              {t("offerButton")}
            </Button>
          </div>
        </section>
      )}

      {(extra.length > 0 || canRule || siteRule) && (
        <div className="grid gap-1.5 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">{t("moreWays")}</span>
          <div className="flex flex-wrap gap-2">
            {extra.map((c) => (
              <Button
                key={c}
                variant="secondary"
                size="lg"
                disabled={!may(c)}
                onClick={() => decide(c)}
              >
                {c === "approve_8h" ? t("approve8h") : t("approveAlways")}
              </Button>
            ))}
            {canRule && (
              <Button
                variant="secondary"
                size="lg"
                disabled={!may("approve_once")}
                onClick={() => decide("approve_once", { makeRule: true })}
              >
                {t("makeRule")}
              </Button>
            )}
            {siteRule && (
              <Link
                className={buttonVariants({ variant: "secondary", size: "lg" })}
                href={{
                  pathname: "/ai-tools/sites",
                  // A device approval carries its device id in agentId.
                  query: { site: approval.resource, host: approval.agentId, tool: approval.toolId },
                }}
              >
                {t("makeSiteRule")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
