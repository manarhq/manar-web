import { HourglassMediumIcon } from "@phosphor-icons/react/ssr";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";

/**
 * Placeholder for a nav route another launch track owns. The owner replaces the page file; the
 * nav never 404s in the meantime.
 */
export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("personal.coming");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <EmptyState icon={HourglassMediumIcon} title={t("title")} description={t("body")} />
    </div>
  );
}
