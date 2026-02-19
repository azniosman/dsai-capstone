import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card variants following the Claymorphism design system:
 * soft diffuse shadows, rounded corners, layered depth.
 *
 * Variants:
 * - default   : Standard card (bg-card, sm shadow)
 * - metric    : KPI / metric card — slightly larger shadow, hover lift
 * - kpi       : Primary KPI — primary accent border, stronger shadow
 * - elevated  : High-priority panel — md shadow, used for main data panels
 * - data      : Data display — muted fill, subtle border (inlined tables/lists)
 * - highlight : Accent-bordered panel — primary tint bg (Pro Insight, alerts)
 * - inset     : Slightly sunken — muted bg (secondary panels, activity sections)
 */
const cardVariants = cva(
  "flex flex-col rounded-2xl border text-card-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-card shadow-sm gap-6 py-6",
        metric:
          "bg-card shadow gap-0 py-0 transition-shadow duration-200 hover:shadow-md",
        kpi:
          "bg-card shadow-md gap-0 py-0 border-primary/25",
        elevated:
          "bg-card shadow-md gap-0 py-0",
        data:
          "bg-muted/40 shadow-xs gap-0 py-0 border-border/60",
        highlight:
          "bg-primary/8 shadow-sm gap-0 py-0 border-primary/30",
        inset:
          "bg-muted/50 shadow-2xs gap-0 py-0 border-border/50",
        /** Transparent card — border only, no background fill (Danger Zone etc.) */
        ghost:
          "bg-transparent shadow-none gap-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
