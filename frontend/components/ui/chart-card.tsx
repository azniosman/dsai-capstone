"use client";

import { ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  height?: number;
  ariaLabel: string;
  /** Optional right-side element (e.g. active-sector label, toggle) */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactElement;
}

/**
 * Shared wrapper for all Recharts charts.
 * Eliminates the Card + CardContent + div + ResponsiveContainer boilerplate.
 */
export function ChartCard({
  title,
  height = 280,
  ariaLabel,
  action,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card variant="elevated" className={className}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">{title}</p>
          {action}
        </div>
        <div
          style={{ height }}
          role="img"
          aria-label={ariaLabel}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
