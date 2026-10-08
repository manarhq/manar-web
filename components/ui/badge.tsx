import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { CheckCircleIcon, ClockIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-1.5 text-xs font-medium whitespace-nowrap transition-colors aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-deny-soft text-deny",
        outline: "border-input text-foreground [a]:hover:bg-subtle",
        ghost: "text-foreground hover:bg-subtle",
        link: "text-foreground underline underline-offset-4",
        // Status (section 2). Each one renders its icon next to the word, so status is
        // never carried by colour alone.
        allow: "bg-allow-soft text-allow",
        wait: "bg-wait-soft text-wait",
        deny: "bg-deny-soft text-deny",
        neutral: "border-line bg-subtle text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const STATUS_ICONS = {
  allow: CheckCircleIcon,
  wait: ClockIcon,
  deny: ProhibitIcon,
} as const;

function Badge({
  className,
  variant = "default",
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  const StatusIcon =
    variant && variant in STATUS_ICONS ? STATUS_ICONS[variant as keyof typeof STATUS_ICONS] : null;
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: StatusIcon ? (
          <>
            <StatusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
            {children}
          </>
        ) : (
          children
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
