import { ShieldXIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/manar/page-header";

export interface AccessDeniedPanelProps {
  title: string;
  /** Overrides the shared common.accessDenied.body copy with something
   * more specific to this page, when useful. */
  body?: string;
}

/**
 * A real permission gap — distinct from `NotFoundPanel` (a resource that
 * doesn't exist) and `NotImplementedPage` (a route this phase never
 * built). `/settings/*`'s tenant-settings endpoints are gated server-side
 * to `TENANT_OWNER`/`SECURITY_ADMIN` (Phase 14's design spec); every page
 * that reads them checks the signed-in user's own roles (from the
 * session, Phase 11a) before ever calling the API and renders this
 * instead — a UX nicety on top of, never instead of, manar-api's own
 * `RolesGuard`, which would 403 regardless.
 */
export async function AccessDeniedPanel({ title, body }: AccessDeniedPanelProps) {
  const t = await getTranslations("common.accessDenied");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
        <ShieldXIcon className="size-6 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{t("title")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{body ?? t("body")}</p>
        </div>
      </div>
    </div>
  );
}
