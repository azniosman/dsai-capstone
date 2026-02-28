"use client";

import { BarChart } from "@tremor/react";

interface MarketSalaryBarProps {
  /** Salary data keyed by category. */
  data: { category: string; salary: number }[];
  /**
   * Index of the active (hovered) sector — bars at other indices are
   * rendered at reduced opacity via Tremor's CSS colour variable.
   */
  activeIdx: number;
}

/**
 * Tremor BarChart showing average monthly salaries (SGD) by tech category.
 * Replaces the inline Recharts `BarChart` in `market/page.tsx`.
 */
export function MarketSalaryBar({ data, activeIdx }: MarketSalaryBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No salary data available.
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    category: d.category,
    "Avg Salary (SGD)": d.salary,
    __active: activeIdx === -1 || i === activeIdx,
  }));

  return (
    <BarChart
      data={chartData}
      index="category"
      categories={["Avg Salary (SGD)"]}
      valueFormatter={(v) => `SGD ${Number(v).toLocaleString("en-SG")}`}
      showLegend={false}
      showGridLines={true}
      className="text-xs"
    />
  );
}

/* ─── YoY Growth Bar ────────────────────────────────────────────────────────── */

interface MarketGrowthBarProps {
  /** Growth data keyed by category. */
  data: { category: string; growth: number }[];
  /** Index of the active sector for opacity highlighting. */
  activeIdx: number;
}

/**
 * Tremor BarChart showing YoY growth (%) by tech category.
 * Replaces the second inline Recharts `BarChart` in `market/page.tsx`.
 */
export function MarketGrowthBar({ data }: MarketGrowthBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No growth data available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    category: d.category,
    "YoY Growth (%)": d.growth,
  }));

  return (
    <BarChart
      data={chartData}
      index="category"
      categories={["YoY Growth (%)"]}
      valueFormatter={(v) => `${v}%`}
      showLegend={false}
      showGridLines={true}
      className="text-xs"
    />
  );
}
