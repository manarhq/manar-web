import { BarricadeIcon } from "@phosphor-icons/react/ssr";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/manar/page-header";

export interface NotImplementedPageProps {
  title: string;
}

/**
 * Section 60's "a route that 404s or shows 'not yet implemented' is
 * honest; a nav link to nothing is confusing" — every stubbed route in
 * this phase renders this rather than being absent from the nav or
 * throwing a real 404. Phase 11b+ replaces this per page as real
 * functionality lands.
 */
export async function NotImplementedPage({ title }: NotImplementedPageProps) {
  const t = await getTranslations("errors.notImplemented");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
        <BarricadeIcon className="size-6 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{t("title")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("body")}</p>
        </div>
      </div>
    </div>
  );
}
