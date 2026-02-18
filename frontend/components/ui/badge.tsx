import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default — primary accent fill
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        // Secondary — muted label
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Destructive
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        // Outline — border only
        outline:
          "text-foreground border-border",
        // Accent — primary-tinted; for active/highlighted states
        accent:
          "bg-primary/12 text-primary border-primary/25 hover:bg-primary/20",
        // Success — green for positive metrics
        success:
          "bg-emerald-500/12 text-emerald-500 border-emerald-500/25 dark:text-emerald-400",
        // Warning — amber for gaps/risks
        warning:
          "bg-amber-500/12 text-amber-600 border-amber-500/25 dark:text-amber-400",
        // Muted — very subtle tags
        muted:
          "bg-muted text-muted-foreground border-transparent",
        // Data — monospace tabular; for numeric data labels
        data:
          "bg-primary/10 text-primary border-primary/20 font-mono tracking-tight tabular-nums",
        // Rank — numbered position indicator
        rank:
          "bg-muted border-border text-muted-foreground font-mono w-6 justify-center px-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
