"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  CircleNotchIcon,
  InfoIcon,
  ProhibitInsetIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PolicySummary } from "@/hooks/use-policies";
import { startPolicyJob, type PolicyJob } from "@/lib/ai-stream/job";
import {
  claimJob,
  getJob,
  releaseJob,
  stopPolicyJob,
  onJobTerminal,
  subscribe,
  trackPolicyJob,
} from "@/lib/ai-stream/job-tracker";
import { StreamHttpError } from "@/lib/ai-stream/sse";
import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { apiErrorMessage } from "@/lib/api/errors";
import { isAiSwitchedOff } from "@/lib/ai-switched-off";

type Target = "new" | "existing";

/**
 * "Suggest with AI" (design-rework.md): a natural-language textarea that
 * starts a background job (`POST /policies/suggest/jobs`; decision 6: a draft
 * can take minutes, longer than a proxy keeps a request open) and follows it
 * with progress. Closing the dialog does not stop the job: a toast says when
 * it is ready (`PolicyJobNotifier`). Deliberately NOT framed as a preview —
 * the job's own doc comment is explicit that a
 * usable result (`available: true`) has already persisted a real `DRAFT`
 * `PolicyVersion` as a side effect of the call, under either an existing
 * policy or a brand-new one. This dialog's copy and its submit button
 * ("Generate draft policy," never "Preview" or "Suggest") reflect that,
 * and on success it routes straight to the resulting policy's normal
 * detail page — the same version-history/publish flow every other draft
 * goes through, never auto-published from here.
 *
 * `available: false` (manar-ai unreachable or no usable draft) is
 * rendered as a calm, explicit "nothing was created" state inside the
 * still-open dialog — never as an error toast — so the operator can
 * reword the request and try again without losing their input.
 */
export function SuggestPolicyDialog({ policies }: { policies: PolicySummary[] }) {
  const t = useTranslations("policies.suggest");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // `policies` arrives via the still-loading usePoliciesList query on first
  // render (an empty array before it resolves), so a plain useState default
  // computed once from policies.length would permanently lock onto "new"
  // even once real policies load in. Track only an explicit user choice
  // here and fall back to a reactive default below, so the default keeps
  // tracking `policies` as it loads until the operator actually picks one.
  const [manualTarget, setManualTarget] = useState<Target | null>(null);
  const target: Target = manualTarget ?? (policies.length > 0 ? "existing" : "new");
  const [policyId, setPolicyId] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [naturalLanguageDescription, setNaturalLanguageDescription] = useState("");
  const [reason, setReason] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const job = useSyncExternalStore(
    subscribe,
    () => getJob(jobId),
    () => undefined,
  );
  const running =
    starting || (!!jobId && (!job || job.status === "queued" || job.status === "running"));
  const elapsedSeconds = useElapsedSeconds(running);

  function reset() {
    setNaturalLanguageDescription("");
    setPolicyName("");
    setPolicyDescription("");
    setPolicyId("");
    setReason("");
    setManualTarget(null);
    setStartError(null);
    // A job still running keeps going; the notifier tells the person when it is ready.
    if (jobIdRef.current) releaseJob(jobIdRef.current);
    jobIdRef.current = null;
    setJobId(null);
  }

  const canSubmit =
    naturalLanguageDescription.trim().length > 0 &&
    (target === "new" ? policyName.trim().length > 0 : policyId.length > 0) &&
    !running;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setStarting(true);
    setStartError(null);
    try {
      const started = await startPolicyJob({
        naturalLanguageDescription: naturalLanguageDescription.trim(),
        ...(target === "new"
          ? {
              policyName: policyName.trim(),
              policyDescription: policyDescription.trim() || undefined,
            }
          : { policyId }),
        reason: reason.trim() || undefined,
      });
      claimJob(started.id);
      jobIdRef.current = started.id;
      setJobId(started.id);
      trackPolicyJob(started);
    } catch (error) {
      setStartError(error instanceof StreamHttpError ? error.body : null);
    } finally {
      setStarting(false);
    }
  }

  // The job ended while this dialog was open: show the draft, as the plain endpoint used to.
  useEffect(
    () =>
      onJobTerminal((final) => {
        if (final.id !== jobIdRef.current) return;
        if (final.status === "ready" && final.result?.available && final.result.policyId) {
          toast.success(t("success"));
          const query = final.result.versionId ? `?version=${final.result.versionId}` : "";
          const policy = final.result.policyId;
          setOpen(false);
          reset();
          router.push(`/policies/${policy}${query}`);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const phaseLabel = (j: PolicyJob) =>
    j.phase === "saving"
      ? t("phaseSaving")
      : j.phase === "drafting"
        ? t("phaseDrafting")
        : t("phaseQueued");
  const unavailable = !!job && job.status === "ready" && !job.result?.available;
  const failed = !!job && (job.status === "failed" || job.status === "cancelled");
  // "Allow external AI" is off: manar-api starts no job and says so.
  const aiOff = isAiSwitchedOff(startError);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <SparkleIcon />
        <span>{t("trigger")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            {/* Same advisory-marking pill as incident-summarize-panel.tsx/
             * audit-investigate-panel.tsx — deliberately neutral (no
             * --primary/--state-safe, constraint 6/2). Shown for the
             * whole time the dialog is open rather than gated on
             * mutation success: unlike the other two panels, a successful
             * call here closes the dialog and navigates away immediately
             * (see the module doc comment above), so there's no separate
             * "AI output rendered in place" moment to gate the badge on —
             * this dialog's entire content is the AI-generated artifact,
             * so the marking applies throughout. "not published" (not
             * "not saved") is the honest wording here: unlike the other
             * two panels' output, a usable result from this endpoint DOES
             * persist a real DRAFT PolicyVersion — sideEffectNotice below
             * explains that; this badge only needs to flag provenance. */}
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              <SparkleIcon className="size-3" aria-hidden />
              {t("aiGeneratedBadge")}
            </span>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>{t("sideEffectNotice")}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggest-description">{t("descriptionLabel")}</Label>
              <Textarea
                id="suggest-description"
                value={naturalLanguageDescription}
                onChange={(e) => setNaturalLanguageDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                maxLength={5000}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("targetLabel")}</Label>
              <Select
                value={target}
                onValueChange={(value) => setManualTarget((value as Target) ?? "existing")}
              >
                <SelectTrigger className="w-full">
                  {/* Base UI's SelectValue shows the raw selected value
                   * ("existing"/"new") unless given a render function —
                   * mapped back to its label here. */}
                  <SelectValue>
                    {(value: Target | null) =>
                      value === "new"
                        ? t("targetNew")
                        : value === "existing"
                          ? t("targetExisting")
                          : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {policies.length > 0 && (
                    <SelectItem value="existing">{t("targetExisting")}</SelectItem>
                  )}
                  <SelectItem value="new">{t("targetNew")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "existing" ? (
              policies.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noPoliciesYet")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suggest-existing-policy">{t("existingPolicyLabel")}</Label>
                  <Select value={policyId} onValueChange={(value) => setPolicyId(value ?? "")}>
                    <SelectTrigger id="suggest-existing-policy" className="w-full">
                      {/* Base UI's SelectValue shows the raw selected
                       * value — here a policy UUID — unless given a
                       * render function, so this maps it back to the
                       * policy's name instead of leaking the raw id. */}
                      <SelectValue placeholder={t("existingPolicyPlaceholder")}>
                        {(value: string | null) =>
                          policies.find((p) => p.id === value)?.name ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suggest-new-name">{t("newPolicyNameLabel")}</Label>
                  <Input
                    id="suggest-new-name"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    placeholder={t("newPolicyNamePlaceholder")}
                    maxLength={200}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suggest-new-description">{t("newPolicyDescriptionLabel")}</Label>
                  <Input
                    id="suggest-new-description"
                    value={policyDescription}
                    onChange={(e) => setPolicyDescription(e.target.value)}
                    maxLength={2000}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggest-reason">{t("reasonLabel")}</Label>
              <Input
                id="suggest-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                autoComplete="off"
              />
            </div>

            {running && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2" role="status">
                  <CircleNotchIcon
                    className="size-4 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                  <span>{t("inProgressHint", { seconds: elapsedSeconds })}</span>
                </div>
                {job && (
                  <p>
                    {phaseLabel(job)}
                    {job.outputTokens > 0 && (
                      <> · {t("tokensSoFar", { count: job.outputTokens })}</>
                    )}
                  </p>
                )}
                <p>{t("backgroundNote")}</p>
                {jobId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    onClick={() => void stopPolicyJob(jobId)}
                  >
                    {t("stop")}
                  </Button>
                )}
              </div>
            )}

            {(startError !== null || failed) && !running && !aiOff && (
              // Measured (WCAG relative-luminance, real getComputedStyle
              // values): text-destructive vs this dialog's --popover
              // surface tops out at 3.93:1 even with zero fill — the
              // destructive token's own contrast margin against an
              // overlay-elevation surface never clears 4.5:1 at any fill
              // alpha, and app/globals.css's token values are out of this
              // task's scope to touch. Message text uses text-foreground
              // (guaranteed-legible in both themes); text-destructive
              // stays on the icon only, a decorative cue that only needs
              // the 3:1 non-text threshold.
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
                <WarningCircleIcon
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <span>
                  {job?.status === "cancelled"
                    ? t("stopped")
                    : job?.error === "stalled"
                      ? t("stalled")
                      : `${t("error")} ${startError ? apiErrorMessage(startError) : ""}`.trim()}
                </span>
              </div>
            )}

            {(unavailable || aiOff) && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <ProhibitInsetIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="flex flex-col gap-1">
                  {aiOff ? (
                    <p>{t("aiOff")}</p>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">{t("unavailableTitle")}</p>
                      <p>{t("unavailableBody")}</p>
                      {job?.result?.explanation && (
                        <p className="italic">{job.result.explanation}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {running ? t("generating") : t("generateButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
