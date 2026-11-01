import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ProductKey = "warden" | "jail" | "ledger";

/**
 * A Manar product name with its plain subtitle (decisions 52 and 53), e.g. "LEDGER signed
 * record". The name is a label, the subtitle says what it does in ordinary words.
 */
export function ProductName({ product, className }: { product: ProductKey; className?: string }) {
  const t = useTranslations("personal.products");
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="text-xs font-semibold tracking-wider text-foreground">
        {t(`${product}.name`)}
      </span>
      <span className="text-xs text-muted-foreground">{t(`${product}.subtitle`)}</span>
    </span>
  );
}
