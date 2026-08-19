"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SparklesIcon, InfoIcon, CircleSlashIcon, Loader2Icon } from "lucide-react";
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
import { useSuggestPolicy, type PolicySummary } from "@/hooks/use-policies";
import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { apiErrorMessage } from "@/lib/api/errors";

type Target = "new" | "existing";

/**
 * "Suggest with AI" (design-rework.md): a natural-language textarea that
 * calls `POST /policies/suggest`. Deliberately NOT framed as a preview —
 * `PolicyController.suggestPolicy`'s own doc comment is explicit that a
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
  const suggest = useSuggestPolicy();
  const elapsedSeconds = useElapsedSeconds(suggest.isPending);

  function reset() {
    setNaturalLanguageDescription("");
    setPolicyName("");
    setPolicyDescription("");
    setPolicyId("");
    setReason("");
    setManualTarget(null);
    suggest.reset();
  }

  const canSubmit =
    naturalLanguageDescription.trim().length > 0 &&
    (target === "new" ? policyName.trim().length > 0 : policyId.length > 0) &&
    !suggest.isPending;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    suggest.mutate(
      {
        naturalLanguageDescription: naturalLanguageDescription.trim(),
        ...(target === "new"
          ? {
              policyName: policyName.trim(),
              policyDescription: policyDescription.trim() || undefined,
            }
          : { policyId }),
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.available && data.policyId) {
            toast.success(t("success"));
            setOpen(false);
            reset();
            const query = data.version ? `?version=${data.version.id}` : "";
            router.push(`/policies/${data.policyId}${query}`);
          }
          // available: false is rendered inline below — dialog stays open.
        },
      },
    );
  }

  const unavailable = suggest.isSuccess && suggest.data && !suggest.data.available;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <SparklesIcon />
        <span>{t("trigger")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
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

            {suggest.isPending && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                <span>{t("inProgressHint", { seconds: elapsedSeconds })}</span>
              </div>
            )}

            {suggest.isError && (
              <p className="text-sm text-destructive">
                {t("error")} {apiErrorMessage(suggest.error)}
              </p>
            )}

            {unavailable && (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                <CircleSlashIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">{t("unavailableTitle")}</p>
                  <p>{t("unavailableBody")}</p>
                  {suggest.data?.explanation && (
                    <p className="italic">{suggest.data.explanation}</p>
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
              {suggest.isPending ? t("generating") : t("generateButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
