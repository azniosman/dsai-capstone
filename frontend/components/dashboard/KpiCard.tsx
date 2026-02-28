"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/* ─── Sub-components ────────────────────────────────────────────────────────── */

/** Animated counting number that increments from 0 to `value`. */
function CountingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const duration = 1500;
    const increment = value / (duration / 16);

    const tick = () => {
      current += increment;
      if (current < value) {
        setDisplay(Math.ceil(current));
        requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display}</span>;
}

/** Delta pill — green for positive, red for negative, muted for zero. */
export function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
        <ArrowUp className="h-3 w-3" />
        {value}
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(value)}
      </span>
    );
  return (
    <span className="text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
      <Minus className="h-3 w-3 inline" />
    </span>
  );
}

/** Semantic color progress bar that animates on mount. */
export function ScoreBar({ score }: { score: number }) {
  const fill =
    score >= 70
      ? "bg-primary"
      : score >= 40
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        className={`h-full ${fill}`}
      />
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────────────────────── */

export interface KpiCardProps {
  /** Lucide icon element rendered inside the accent pill. */
  icon: React.ReactNode;
  /** Uppercase label text displayed above the value. */
  label: string;
  /** Integer metric value — animated from 0 on mount. */
  value: number;
  /** Delta since last period — positive / negative / zero. */
  delta: number;
  /** Optional suffix appended after the value (e.g. "%"). */
  suffix?: string;
  /** Tailwind text color class applied to the metric value (e.g. "text-primary"). */
  accentColor?: string;
  /** Tailwind bg/text class for the icon pill (e.g. "bg-primary/10 text-primary"). */
  iconColor?: string;
  /** Tailwind bg class for the icon pill hover glow (e.g. "bg-primary/5"). */
  glowColor?: string;
  /** Sub-label shown beside the delta pill. */
  subLabel?: string;
  /** When true, renders a score bar instead of a delta pill. */
  showScoreBar?: boolean;
  /** Framer Motion entrance delay in seconds. */
  motionDelay?: number;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

/**
 * Reusable animated KPI card for dashboard metric tiles.
 *
 * Preserves the existing glassmorphism clay-card visual style while
 * extracting the repeated pattern from `dashboard/page.tsx`.
 */
export function KpiCard({
  icon,
  label,
  value,
  delta,
  suffix,
  accentColor = "text-foreground",
  iconColor = "bg-primary/10 text-primary ring-primary/20",
  glowColor = "bg-primary/5",
  subLabel = "Active in profile",
  showScoreBar = false,
  motionDelay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: motionDelay }}
    >
      <Card className="h-full clay-card hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
        {/* Decorative glow blob */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 ${glowColor} rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:opacity-100 transition-colors`}
        />
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          {/* Icon + label */}
          <div>
            <div
              className={`p-2 ${iconColor} w-fit rounded-xl mb-4 ring-1 shadow-none`}
            >
              {icon}
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {label}
            </p>
          </div>

          {/* Metric + indicator */}
          <div>
            <div
              className={`text-4xl font-black tracking-tighter mb-2 flex items-baseline ${accentColor}`}
            >
              <CountingNumber value={value} />
              {suffix && (
                <span className="text-xl font-bold ml-1">{suffix}</span>
              )}
            </div>

            {showScoreBar ? (
              <ScoreBar score={value} />
            ) : (
              <div className="flex items-center gap-2">
                <Delta value={delta} />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {subLabel}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Skeleton grid of 4 KPI card placeholders shown while data loads. */
export function KpiCardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="clay-card overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
            <div className="h-10 w-16 bg-muted/60 rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
