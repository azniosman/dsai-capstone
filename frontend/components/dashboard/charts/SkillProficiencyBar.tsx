"use client";

import { BarChart } from "@tremor/react";

/** Single data point for the skill proficiency bar chart. */
export interface SkillLevelDatum {
  skill: string;
  level: number; // 0–1
}

interface SkillProficiencyBarProps {
  /** Skill level data — sorted descending by level before display. */
  data: SkillLevelDatum[];
  /** Optional height in pixels. Defaults to auto based on item count. */
  height?: number;
}

/**
 * Horizontal bar chart showing the current proficiency level for each
 * tracked skill. Replaces the inline Recharts BarChart in `progress/page.tsx`.
 *
 * Uses Tremor's `BarChart` which is pre-styled and responsive.
 */
export function SkillProficiencyBar({ data }: SkillProficiencyBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No skills tracked yet.
      </div>
    );
  }

  // Tremor BarChart expects values in the same unit — convert 0–1 to 0–100
  const chartData = data.map((d) => ({
    skill: d.skill,
    "Level (%)": Math.round(d.level * 100),
  }));

  return (
    <BarChart
      data={chartData}
      index="skill"
      categories={["Level (%)"]}
      layout="vertical"
      valueFormatter={(v) => `${v}%`}
      showLegend={false}
      showGridLines={true}
      className="text-xs"
    />
  );
}
