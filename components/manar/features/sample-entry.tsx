"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { useCreateSample, useDeleteSample } from "@/hooks/use-features";
import { useRouter } from "@/i18n/navigation";
import { markSample, sampleSnapshot } from "@/lib/personal/sample-mode";

export function SampleEntry() {
  const t = useTranslations("features.sample");
  const router = useRouter();
  const create = useCreateSample();
  const del = useDeleteSample();
  const [note, setNote] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(() => sampleSnapshot() !== null);

  function open() {
    setNote(null);
    create.mutate(undefined, {
      onSuccess: (r) => {
        if (r.status === "QUEUED") return setNote(t("queued"));
        markSample(r.tenantId);
        router.push("/home");
      },
      onError: (e) =>
        setNote(
          (e as { code?: string }).code === "sample_unavailable" ? t("unavailable") : t("failed"),
        ),
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <PageHeader title={t("title")} description={t("body")} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={open} disabled={create.isPending}>
          {create.isPending ? t("opening") : t("open")}
        </Button>
        {isSample && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                markSample(null);
                router.push("/home");
              }}
            >
              {t("back")}
            </Button>
            <Button
              variant="outline"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(undefined, {
                  onSuccess: () => {
                    markSample(null);
                    setIsSample(false);
                    setNote(t("deleted"));
                  },
                  onError: () => setNote(t("failed")),
                })
              }
            >
              {t("delete")}
            </Button>
          </>
        )}
      </div>
      {note && (
        <p role="status" className="text-sm text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
