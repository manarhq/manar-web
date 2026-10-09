import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Icons in this console: Phosphor only (docs/design/DESIGN-SYSTEM.md rule 10).
 *   - Import the `*Icon` names from "@phosphor-icons/react/ssr". That entry has no React
 *     context, so the same import works in server and client components.
 *   - Size with Tailwind, not the `size` prop: size-4 (16px) in buttons, inputs and menus,
 *     size-3.5 in badges, size-5 in navigation. components/ui sizes bare <svg> children.
 *   - Weight "regular" by default; "bold" at 14px and below so strokes stay legible.
 *   - Icons that point (carets, arrows, panel toggles) get `rtl:-scale-x-100`.
 *   - Status is never colour alone: pair the icon with a word.
 */

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Ink. In the console red means stop, so the primary action is ink.
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        // Surface with a line border. `outline` is the older name for the same look.
        secondary: "border-input bg-card text-foreground hover:bg-subtle aria-expanded:bg-subtle",
        outline: "border-input bg-card text-foreground hover:bg-subtle aria-expanded:bg-subtle",
        ghost: "text-foreground hover:bg-subtle aria-expanded:bg-subtle",
        // Red: deny, kill switch, delete.
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        link: "text-foreground underline decoration-line-strong underline-offset-4 hover:decoration-current",
      },
      size: {
        // 36px comfortable, 32px compact (--density-control-height).
        default:
          "h-(--density-control-height) gap-2 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        xs: "h-8 gap-1 px-2 text-xs has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        // 44px: touch targets and the one big call to action.
        lg: "h-11 gap-2 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        icon: "size-(--density-control-height)",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
