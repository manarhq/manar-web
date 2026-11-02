"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ProductKey = "warden" | "jail" | "door" | "ledger";

/**
 * A part of Manar, named in plain words ("Network control", never the internal code name), with
 * a one-sentence explanation on hover and on keyboard focus. `children` replaces the label when
 * the name sits inside a sentence ("through <term>the local gateway</term>").
 */
export function ProductName({
  product,
  children,
  className,
}: {
  product: ProductKey;
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("personal.products");
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        aria-description={t(`${product}.explain`)}
        className={cn(
          "cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-4 focus-visible:rounded-sm",
          className,
        )}
      >
        {children ?? t(`${product}.name`)}
      </TooltipTrigger>
      <TooltipContent>{t(`${product}.explain`)}</TooltipContent>
    </Tooltip>
  );
}
