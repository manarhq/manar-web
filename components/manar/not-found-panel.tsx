"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/manar/page-header";

export interface NotFoundPanelProps {
  title: string;
  /** Overrides the shared common.notFound.body copy with something more
   * specific to this resource, when useful. */
  body?: string;
}

/** A resource genuinely not found — distinct from `NotImplementedPage`
 * (a route this phase never built at all). Used by every detail page
 * whose lookup (`lib/api/find-by-id.ts`) comes back empty: a bad/stale
 * ID, or a row further back than the scan's page cap. */
export function NotFoundPanel({ title, body }: NotFoundPanelProps) {
  const t = useTranslations("common.notFound");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
        <MagnifyingGlassIcon className="size-6 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{t("title")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{body ?? t("body")}</p>
        </div>
      </div>
    </div>
  );
}
