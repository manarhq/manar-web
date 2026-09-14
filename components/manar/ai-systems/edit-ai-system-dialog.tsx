"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SquarePenIcon } from "lucide-react";
import { toast } from "sonner";

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
import { useUserOptions } from "@/components/manar/ai-systems/user-name";
import { isoToReviewDateInput, reviewDateToIso } from "@/components/manar/ai-systems/review-date";
import {
  useUpdateAiSystem,
  type AiSystemDataClassification,
  type AiSystemDetail,
  type AiSystemEnvironment,
  type UpdateAiSystemRequest,
} from "@/hooks/use-ai-systems";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

const ENVIRONMENTS: AiSystemEnvironment[] = ["DEVELOPMENT", "STAGING", "PRODUCTION"];
const CLASSIFICATIONS: AiSystemDataClassification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
];

/**
 * `PATCH /ai-systems/:id`.
 *
 * `changeReason` is a first-class, required field here — never a hidden
 * default, never "edited via console". The endpoint requires it because
 * every field on this form is *material*: submitting snapshots the record
 * as it stands into the version history and increments its version in the
 * same transaction, and an unexplained material change is not evidence of
 * anything.
 *
 * Only fields the operator actually changed are sent. Clearing a declared
 * provider/model or a review date sends an explicit `null` (the API's way
 * of clearing a declaration) rather than an empty string, and leaving a
 * blank field blank sends nothing at all. `slug` and `lifecycleState` are
 * absent by design: the slug is immutable after creation, and lifecycle
 * moves only through a recorded transition.
 */
export function EditAiSystemDialog({ system }: { system: AiSystemDetail }) {
  const t = useTranslations("aiSystems.editDialog");
  const tSystems = useTranslations("aiSystems");
  const tCommon = useTranslations("common.actions");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(system.name);
  const [businessPurpose, setBusinessPurpose] = useState(system.businessPurpose);
  const [ownerId, setOwnerId] = useState(system.ownerId);
  const [businessUnit, setBusinessUnit] = useState(system.businessUnit);
  const [environment, setEnvironment] = useState<AiSystemEnvironment>(system.environment);
  const [dataClassification, setDataClassification] = useState<AiSystemDataClassification>(
    system.dataClassification,
  );
  const [declaredProvider, setDeclaredProvider] = useState(system.declaredProvider ?? "");
  const [declaredModel, setDeclaredModel] = useState(system.declaredModel ?? "");
  const [riskRationale, setRiskRationale] = useState(system.riskRationale);
  const [nextReviewDate, setNextReviewDate] = useState(isoToReviewDateInput(system.nextReviewDate));
  const [changeReason, setChangeReason] = useState("");

  const users = useUserOptions();
  const update = useUpdateAiSystem(system.id);

  function resetToRecord() {
    setName(system.name);
    setBusinessPurpose(system.businessPurpose);
    setOwnerId(system.ownerId);
    setBusinessUnit(system.businessUnit);
    setEnvironment(system.environment);
    setDataClassification(system.dataClassification);
    setDeclaredProvider(system.declaredProvider ?? "");
    setDeclaredModel(system.declaredModel ?? "");
    setRiskRationale(system.riskRationale);
    setNextReviewDate(isoToReviewDateInput(system.nextReviewDate));
    setChangeReason("");
    update.reset();
  }

  /** A nullable declaration: emptied when it had a value -> explicit
   * `null` (clear it); left empty when it was already empty -> omitted. */
  function nullableChange(
    next: string,
    current: string | null,
  ): { changed: true; value: string | null } | { changed: false } {
    const trimmed = next.trim();
    const normalized = trimmed.length > 0 ? trimmed : null;
    return normalized === (current ?? null)
      ? { changed: false }
      : { changed: true, value: normalized };
  }

  function buildPatch(): Omit<UpdateAiSystemRequest, "changeReason"> {
    const patch: Omit<UpdateAiSystemRequest, "changeReason"> = {};
    if (name.trim() !== system.name) patch.name = name.trim();
    if (businessPurpose.trim() !== system.businessPurpose)
      patch.businessPurpose = businessPurpose.trim();
    if (ownerId !== system.ownerId) patch.ownerId = ownerId;
    if (businessUnit.trim() !== system.businessUnit) patch.businessUnit = businessUnit.trim();
    if (environment !== system.environment) patch.environment = environment;
    if (dataClassification !== system.dataClassification)
      patch.dataClassification = dataClassification;
    if (riskRationale.trim() !== system.riskRationale) patch.riskRationale = riskRationale.trim();

    const provider = nullableChange(declaredProvider, system.declaredProvider);
    if (provider.changed) patch.declaredProvider = provider.value;
    const model = nullableChange(declaredModel, system.declaredModel);
    if (model.changed) patch.declaredModel = model.value;

    const nextReviewIso = reviewDateToIso(nextReviewDate) ?? null;
    const currentReviewIso = system.nextReviewDate
      ? (reviewDateToIso(isoToReviewDateInput(system.nextReviewDate)) ?? null)
      : null;
    if (nextReviewIso !== currentReviewIso) patch.nextReviewDate = nextReviewIso;

    return patch;
  }

  const patch = buildPatch();
  const hasChanges = Object.keys(patch).length > 0;
  const canSubmit = hasChanges && changeReason.trim().length > 0 && !update.isPending;

  const status = apiErrorStatus(update.error);
  const errorMessage = update.isError
    ? status === 409
      ? t("retiredConflict")
      : status === 403
        ? t("readOnly")
        : apiErrorMessage(update.error)
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetToRecord();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <SquarePenIcon />
        <span>{t("trigger")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            update.mutate(
              { ...patch, changeReason: changeReason.trim() },
              {
                onSuccess: (updated) => {
                  toast.success(t("success", { version: updated.version }));
                  setOpen(false);
                  setChangeReason("");
                  update.reset();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            {/* The reason leads the form rather than trailing it: it is a
             * required governed field, not a confirmation checkbox. */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <Label htmlFor="ai-system-change-reason">{t("changeReasonLabel")}</Label>
              <Textarea
                id="ai-system-change-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder={t("changeReasonPlaceholder")}
                rows={2}
                maxLength={2000}
                required
                aria-required="true"
              />
              <span className="text-xs text-muted-foreground">{t("changeReasonHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-name">{tSystems("detail.name")}</Label>
              <Input
                id="ai-system-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-purpose">{tSystems("detail.businessPurpose")}</Label>
              <Textarea
                id="ai-system-edit-purpose"
                value={businessPurpose}
                onChange={(e) => setBusinessPurpose(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-owner">{tSystems("detail.owner")}</Label>
              <Select
                value={ownerId}
                onValueChange={(value) => setOwnerId((value as string) ?? "")}
              >
                <SelectTrigger id="ai-system-edit-owner" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (users.find((u) => u.id === value)?.displayName ?? value) : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-business-unit">
                {tSystems("detail.businessUnit")}
              </Label>
              <Input
                id="ai-system-edit-business-unit"
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                autoComplete="off"
                maxLength={200}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-edit-environment">{tSystems("detail.environment")}</Label>
                <Select
                  value={environment}
                  onValueChange={(value) => setEnvironment(value as AiSystemEnvironment)}
                >
                  <SelectTrigger id="ai-system-edit-environment" className="w-full">
                    <SelectValue>
                      {(value: AiSystemEnvironment | null) =>
                        value ? tSystems(`environment.${value}`) : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tSystems(`environment.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-edit-classification">
                  {tSystems("detail.dataClassification")}
                </Label>
                <Select
                  value={dataClassification}
                  onValueChange={(value) =>
                    setDataClassification(value as AiSystemDataClassification)
                  }
                >
                  <SelectTrigger id="ai-system-edit-classification" className="w-full">
                    <SelectValue>
                      {(value: AiSystemDataClassification | null) =>
                        value ? tSystems(`dataClassification.${value}`) : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tSystems(`dataClassification.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-edit-provider">
                  {tSystems("detail.declaredProvider")}
                </Label>
                <Input
                  id="ai-system-edit-provider"
                  value={declaredProvider}
                  onChange={(e) => setDeclaredProvider(e.target.value)}
                  autoComplete="off"
                  maxLength={200}
                />
                {system.declaredProvider !== null && declaredProvider.trim() === "" && (
                  <span className="text-xs text-muted-foreground">{t("clearDeclaration")}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-edit-model">{tSystems("detail.declaredModel")}</Label>
                <Input
                  id="ai-system-edit-model"
                  value={declaredModel}
                  onChange={(e) => setDeclaredModel(e.target.value)}
                  autoComplete="off"
                  maxLength={200}
                />
                {system.declaredModel !== null && declaredModel.trim() === "" && (
                  <span className="text-xs text-muted-foreground">{t("clearDeclaration")}</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{tSystems("declaredHint")}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-risk-rationale">
                {tSystems("detail.riskRationale")}
              </Label>
              <Textarea
                id="ai-system-edit-risk-rationale"
                value={riskRationale}
                onChange={(e) => setRiskRationale(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-edit-next-review">
                {tSystems("detail.nextReviewDate")}
              </Label>
              <Input
                id="ai-system-edit-next-review"
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="w-fit"
              />
              <span className="text-xs text-muted-foreground">{tSystems("unscheduledHint")}</span>
            </div>

            <p className="text-xs text-muted-foreground-tertiary">{t("lifecycleNotEditable")}</p>
            {!hasChanges && <p className="text-xs text-muted-foreground">{t("noChanges")}</p>}
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {update.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
