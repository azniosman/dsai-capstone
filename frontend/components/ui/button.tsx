import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary — electric cyan in dark, deep teal in light; max contrast
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85 hover:-translate-y-px active:translate-y-0 shadow-sm",
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline — crisp 2px border, accent on hover
        outline:
          "border-2 border-border bg-transparent text-foreground hover:border-primary hover:text-primary",
        // Secondary — muted bg, subtle
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/75 border border-border",
        // Ghost — transparent until hover; accent color on hover
        ghost:
          "hover:bg-primary/10 hover:text-primary",
        // Link
        link:
          "text-primary underline-offset-4 hover:underline",
        // Accent — explicit alias for default; use for CTAs
        accent:
          "bg-primary text-primary-foreground hover:bg-primary/85 hover:-translate-y-px active:translate-y-0 shadow-sm",
        // Muted — for secondary actions
        muted:
          "bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground",
        // Danger — destructive outlined; for delete/risky actions
        danger:
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-base font-bold",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
