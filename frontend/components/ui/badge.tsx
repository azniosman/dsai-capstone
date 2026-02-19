import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Badge variants — extended for SkillBridge semantic states:
 *
 * shadcn defaults: default, secondary, destructive, outline, ghost, link
 * SkillBridge additions:
 *   success  — green, for matched skills / positive states
 *   warning  — amber, for moderate matches / gaps
 *   muted    — muted foreground, for secondary labels
 *   data     — monospaced, tabular-nums, for numeric data
 *   accent   — accent color, for suggested prompts / interactive chips
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // ─── shadcn defaults ───
        default:
          "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost:
          "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 [a&]:hover:underline",

        // ─── SkillBridge additions ───
        /** Positive state — matched skills, strong match quality */
        success:
          "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
        /** Caution state — moderate match, medium gap severity */
        warning:
          "bg-amber-500/12 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
        /** Subdued label — section metadata, secondary info */
        muted:
          "bg-muted text-muted-foreground border-border/60",
        /** Numeric data badge — tabular-nums, monospace feel */
        data:
          "bg-muted text-foreground border-border/60 font-mono tabular-nums",
        /** Interactive accent chip — suggested prompts, clickable tags */
        accent:
          "bg-accent text-accent-foreground border-accent/30 [a&]:hover:bg-accent/80 cursor-pointer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
