"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
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
import { useUserOptions } from "@/components/manar/ai-systems/user-name";
import { reviewDateToIso } from "@/components/manar/ai-systems/review-date";
import {
  useCreateAiSystem,
  type AiSystemDataClassification,
  type AiSystemEnvironment,
} from "@/hooks/use-ai-systems";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

const ENVIRONMENTS: AiSystemEnvironment[] = ["DEVELOPMENT", "STAGING", "PRODUCTION"];
const CLASSIFICATIONS: AiSystemDataClassification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
];

export function CreateAiSystemDialog() {
  const t = useTranslations("aiSystems.createDialog");
  const tSystems = useTranslations("aiSystems");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [environment, setEnvironment] = useState<AiSystemEnvironment>("DEVELOPMENT");
  const [dataClassification, setDataClassification] =
    useState<AiSystemDataClassification>("INTERNAL");
  const [declaredProvider, setDeclaredProvider] = useState("");
  const [declaredModel, setDeclaredModel] = useState("");
  const [riskRationale, setRiskRationale] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  const users = useUserOptions();
  const createAiSystem = useCreateAiSystem();

  function reset() {
    setSlug("");
    setName("");
    setBusinessPurpose("");
    setOwnerId("");
    setBusinessUnit("");
    setEnvironment("DEVELOPMENT");
    setDataClassification("INTERNAL");
    setDeclaredProvider("");
    setDeclaredModel("");
    setRiskRationale("");
    setNextReviewDate("");
    createAiSystem.reset();
  }

  const canSubmit =
    slug.trim().length > 0 &&
    name.trim().length > 0 &&
    businessPurpose.trim().length > 0 &&
    ownerId.length > 0 &&
    businessUnit.trim().length > 0 &&
    riskRationale.trim().length > 0 &&
    !createAiSystem.isPending;

  const status = apiErrorStatus(createAiSystem.error);
  const errorMessage = createAiSystem.isError
    ? status === 409
      ? t("slugConflict")
      : status === 404
        ? t("ownerNotFound")
        : apiErrorMessage(createAiSystem.error)
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        <span>{t("trigger")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createAiSystem.mutate(
              {
                slug: slug.trim(),
                name: name.trim(),
                businessPurpose: businessPurpose.trim(),
                ownerId,
                businessUnit: businessUnit.trim(),
                environment,
                dataClassification,
                declaredProvider: declaredProvider.trim() || undefined,
                declaredModel: declaredModel.trim() || undefined,
                riskRationale: riskRationale.trim(),
                nextReviewDate: reviewDateToIso(nextReviewDate),
              },
              {
                onSuccess: (created) => {
                  toast.success(t("success", { name: created.name }));
                  setOpen(false);
                  reset();
                  router.push(`/ai-systems/${created.id}`);
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-slug">{t("slugLabel")}</Label>
              <Input
                id="ai-system-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t("slugPlaceholder")}
                className="font-mono text-xs"
                autoComplete="off"
                maxLength={120}
              />
              <span className="text-xs text-muted-foreground">{t("slugHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-name">{t("nameLabel")}</Label>
              <Input
                id="ai-system-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                autoComplete="off"
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-purpose">{t("businessPurposeLabel")}</Label>
              <Textarea
                id="ai-system-purpose"
                value={businessPurpose}
                onChange={(e) => setBusinessPurpose(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <span className="text-xs text-muted-foreground">{t("businessPurposeHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-owner">{t("ownerLabel")}</Label>
              <Select
                value={ownerId}
                onValueChange={(value) => setOwnerId((value as string) ?? "")}
              >
                <SelectTrigger id="ai-system-owner" className="w-full">
                  {/* Base UI's SelectValue renders the raw selected value —
                   * here a user UUID — unless given a render function. */}
                  <SelectValue placeholder={t("ownerPlaceholder")}>
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
              <span className="text-xs text-muted-foreground">{t("ownerHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-business-unit">{t("businessUnitLabel")}</Label>
              <Input
                id="ai-system-business-unit"
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                placeholder={t("businessUnitPlaceholder")}
                autoComplete="off"
                maxLength={200}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-environment">{t("environmentLabel")}</Label>
                <Select
                  value={environment}
                  onValueChange={(value) => setEnvironment(value as AiSystemEnvironment)}
                >
                  <SelectTrigger id="ai-system-environment" className="w-full">
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
                <Label htmlFor="ai-system-classification">{t("dataClassificationLabel")}</Label>
                <Select
                  value={dataClassification}
                  onValueChange={(value) =>
                    setDataClassification(value as AiSystemDataClassification)
                  }
                >
                  <SelectTrigger id="ai-system-classification" className="w-full">
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
                <span className="text-xs text-muted-foreground">{t("dataClassificationHint")}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-provider">{t("declaredProviderLabel")}</Label>
                <Input
                  id="ai-system-provider"
                  value={declaredProvider}
                  onChange={(e) => setDeclaredProvider(e.target.value)}
                  placeholder={t("declaredProviderPlaceholder")}
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-system-model">{t("declaredModelLabel")}</Label>
                <Input
                  id="ai-system-model"
                  value={declaredModel}
                  onChange={(e) => setDeclaredModel(e.target.value)}
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
            </div>
            {/* These two are declarations, never verified against the
             * running service — said once here rather than implied. */}
            <p className="text-xs text-muted-foreground">{tSystems("declaredHint")}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-risk-rationale">{t("riskRationaleLabel")}</Label>
              <Textarea
                id="ai-system-risk-rationale"
                value={riskRationale}
                onChange={(e) => setRiskRationale(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <span className="text-xs text-muted-foreground">{t("riskRationaleHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-system-next-review">{t("nextReviewDateLabel")}</Label>
              <Input
                id="ai-system-next-review"
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="w-fit"
              />
              <span className="text-xs text-muted-foreground">{t("nextReviewDateHint")}</span>
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createAiSystem.isPending ? tCommon("creating") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
