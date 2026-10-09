"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { LockOpenIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import {
  useAgentQuarantine,
  useReleaseQuarantine,
  type AgentQuarantine,
} from "@/hooks/use-quarantines";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/errors";

/** Deny tokens, icon and word (the deny Badge variant draws the icon). */
export function QuarantinedBadge() {
  const t = useTranslations("agents.quarantine");
  return <Badge variant="deny">{t("badge")}</Badge>;
}

/** Header badge for agent detail. Renders only when an active quarantine is known. */
export function AgentQuarantineHeaderBadge({
  agentId,
  canManage,
}: {
  agentId: string;
  canManage: boolean;
}) {
  const { data } = useAgentQuarantine(agentId, canManage);
  return data?.active ? <QuarantinedBadge /> : null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function Explanation({ lang, text }: { lang: "en" | "ar"; text: string | null }) {
  const t = useTranslations("agents.quarantine");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          {t(lang === "en" ? "explanationEn" : "explanationAr")}
        </span>
        <Badge variant="neutral">{t("generatedNotVerified")}</Badge>
      </div>
      {text ? (
        <p
          dir={lang === "ar" ? "rtl" : "ltr"}
          lang={lang}
          className="text-sm whitespace-pre-line text-foreground"
          data-explanation={lang}
        >
          {text}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noExplanation")}</p>
      )}
    </div>
  );
}

function ReleaseQuarantineDialog({
  agentId,
  onNoActive,
}: {
  agentId: string;
  onNoActive: () => void;
}) {
  const t = useTranslations("agents.quarantine");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const release = useReleaseQuarantine(agentId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setNote("");
          release.reset();
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <LockOpenIcon />
        {t("release")}
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (release.isPending) return;
            release.mutate(note.trim(), {
              onSuccess: () => {
                toast.success(t("releasedToast"));
                setOpen(false);
              },
              onError: (error) => {
                if (apiErrorStatus(error) === 404) {
                  setOpen(false);
                  onNoActive();
                }
              },
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quarantine-release-note">{t("noteLabel")}</Label>
            <Textarea
              id="quarantine-release-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
            />
            {release.isError && apiErrorStatus(release.error) !== 404 && (
              <p className="text-sm text-destructive">{apiErrorMessage(release.error)}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={release.isPending}>
              {release.isPending ? tCommon("submitting") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuarantineDetails({
  quarantine,
  canManage,
  onNoActive,
}: {
  quarantine: AgentQuarantine;
  canManage: boolean;
  onNoActive: () => void;
}) {
  const t = useTranslations("agents.quarantine");
  const format = useFormatter();
  const resolveActor = useActorNameResolver();
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {t("title")}
          {quarantine.active ? (
            <QuarantinedBadge />
          ) : (
            <Badge variant="neutral">{t("releasedBadge")}</Badge>
          )}
        </h2>
        {quarantine.active && canManage && (
          <ReleaseQuarantineDialog agentId={quarantine.agentId} onNoActive={onNoActive} />
        )}
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("reason")} value={<span className="font-data">{quarantine.reason}</span>} />
        <Field
          label={t("detector")}
          value={
            quarantine.detector ? (
              <span className="font-data">{quarantine.detector}</span>
            ) : (
              <span className="text-muted-foreground">{t("notReported")}</span>
            )
          }
        />
        <Field label={t("quarantinedAt")} value={when(quarantine.quarantinedAt)} />
        <Field
          label={t("evidence")}
          value={
            quarantine.evidence.length === 0 ? (
              <span className="text-muted-foreground">{t("noEvidence")}</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {quarantine.evidence.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/authorization/${id}`}
                      className="font-data text-xs text-foreground underline decoration-line-strong underline-offset-4 hover:decoration-current"
                    >
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        />
        {!quarantine.active && quarantine.releasedAt && (
          <>
            <Field
              label={t("releasedBy")}
              value={resolveActor({ type: "human", id: quarantine.releasedBy ?? undefined })}
            />
            <Field label={t("releasedAt")} value={when(quarantine.releasedAt)} />
            <Field
              label={t("releaseNote")}
              value={
                quarantine.releaseNote ?? (
                  <span className="text-muted-foreground">{t("noNote")}</span>
                )
              }
            />
          </>
        )}
      </dl>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Explanation lang="en" text={quarantine.explanationEn} />
        <Explanation lang="ar" text={quarantine.explanationAr} />
      </div>
    </>
  );
}

/**
 * The watcher's quarantine for this agent (ADR-0009 in manar-api). manar-api lets only
 * Security Admins and Tenant Owners read or release quarantines, so other roles see a note
 * saying so, never an "all clear".
 */
export function AgentQuarantinePanel({
  agentId,
  canManage,
}: {
  agentId: string;
  canManage: boolean;
}) {
  const t = useTranslations("agents.quarantine");
  const query = useAgentQuarantine(agentId, canManage);
  const [noActive, setNoActive] = useState(false);

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">{t("roleNote")}</p>;
  }
  if (query.isPending) return <Skeleton className="h-32 w-full" />;
  // Nothing listed for this agent: no panel, and no "all clear" claim either.
  if (!query.isError && !query.data && !noActive) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-live="polite">
      {noActive && (
        <p role="status" className="mb-3 text-sm text-foreground">
          {t("noActive")}
        </p>
      )}
      {query.isError ? (
        <p className="text-sm text-destructive">{t("loadError")}</p>
      ) : query.data ? (
        <QuarantineDetails
          quarantine={query.data}
          canManage={canManage}
          onNoActive={() => {
            setNoActive(true);
            void query.refetch();
          }}
        />
      ) : null}
    </section>
  );
}
