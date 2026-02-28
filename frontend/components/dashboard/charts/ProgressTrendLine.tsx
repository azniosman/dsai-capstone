"use client";

import { LineChart } from "@tremor/react";

interface ProgressTrendLineProps {
  /**
   * Timeline data — each object must have a `date` key plus one numeric
   * key per tracked skill (0–1 range).
   */
  data: Record<string, unknown>[];
  /** List of skill names to render as separate series. */
  skills: string[];
}

/**
 * Multi-series line chart showing skill progress over time.
 * Replaces the inline Recharts `LineChart` in `progress/page.tsx`.
 *
 * Uses Tremor's `LineChart` which handles series colouring, tooltips,
 * and responsiveness automatically.
 */
export function ProgressTrendLine({ data, skills }: ProgressTrendLineProps) {
  if (data.length === 0 || skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No progress entries recorded yet.
      </div>
    );
  }

  // Tremor needs percentage values — map 0–1 → 0–100
  const chartData = data.map((row) => {
    const transformed: Record<string, unknown> = { date: row.date };
    for (const skill of skills) {
      const raw = row[skill];
      if (typeof raw === "number") {
        transformed[skill] = Math.round(raw * 100);
      }
    }
    return transformed;
  });

  return (
    <LineChart
      data={chartData as Record<string, number | string>[]}
      index="date"
      categories={skills}
      valueFormatter={(v) => `${v}%`}
      showLegend={true}
      showGridLines={true}
      curveType="monotone"
      className="text-xs"
    />
  );
}
