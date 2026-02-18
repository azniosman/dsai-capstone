import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-md border text-card-foreground transition-all duration-150",
  {
    variants: {
      variant: {
        // Default — standard card
        default:
          "bg-card border-border shadow-sm",
        // Elevated — more prominent panels
        elevated:
          "bg-card border-border shadow-md",
        // KPI — accent-tinted for metric highlights
        kpi:
          "bg-primary/8 border-primary/25 shadow-sm",
        // Panel — slightly lighter bg for nested content
        panel:
          "bg-secondary/50 border-border shadow-none",
        // Ghost — no bg, just border
        ghost:
          "bg-transparent border-border shadow-none",
        // Data — top accent stripe; use for primary data panels
        data:
          "bg-card border-border border-t-2 border-t-primary shadow-sm",
        // Metric — left accent bar; Bloomberg-style KPI emphasis
        metric:
          "bg-card border border-border border-l-[3px] border-l-primary shadow-sm",
        // Highlight — primary-tinted for selected/featured panels
        highlight:
          "bg-primary/5 border border-primary/30 shadow-none",
        // Inset — darker bg for nested sections
        inset:
          "bg-background border border-border shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> { }

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
