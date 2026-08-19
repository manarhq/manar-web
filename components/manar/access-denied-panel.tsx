import { ShieldXIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/manar/empty-state";
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
      <EmptyState
        icon={ShieldXIcon}
        title={t("title")}
        description={body ?? t("body")}
        className="py-24"
      />
    </div>
  );
}
