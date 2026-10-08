import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export type ActionCategory = "read" | "change" | "destructive" | "unknown";

/**
 * Read / change / destructive, derived only from the ToolAction flags
 * manar-api returns (`mutating`, `destructive`). Destructive wins over
 * change. Missing or non-boolean flags are `unknown`, never `read`: an
 * action we cannot classify must not look harmless.
 */
export function actionCategory(
  effect: { mutating?: unknown; destructive?: unknown } | null | undefined,
): ActionCategory {
  if (!effect || typeof effect.mutating !== "boolean" || typeof effect.destructive !== "boolean") {
    return "unknown";
  }
  if (effect.destructive) return "destructive";
  return effect.mutating ? "change" : "read";
}

const VARIANT = {
  read: "secondary",
  change: "outline",
  destructive: "destructive",
  unknown: "outline",
} as const;

export function ActionCategoryBadge({ category }: { category: ActionCategory }) {
  const t = useTranslations("common.actionCategory");
  return (
    <Badge
      variant={VARIANT[category]}
      data-action-category={category}
      className={category === "unknown" ? "border-dashed text-muted-foreground" : undefined}
    >
      {t(category)}
    </Badge>
  );
}
