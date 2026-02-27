"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GAP_COLOR, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-colors";

/** Single skill gap entry from the API. */
export interface GapItem {
  skill: string;
  user_level: number;
  required_level: string;
  user_level_label: string;
  gap_severity: string;
  priority: string;
}

interface SkillGapChartProps {
  /** The list of skill gaps to visualise. */
  gaps: GapItem[];
}

/**
 * Interactive chart that shows skill-level gaps as either a Radar or
 * horizontal Bar chart, toggled by the user.
 *
 * Extracted from the inline JSX inside `SkillGapView` in `skill-gap/page.tsx`.
 * Keeps Recharts for Radar (Tremor v4 has no RadarChart), uses the existing
 * `ChartCard` wrapper and `chart-colors` constants.
 */
export function SkillGapChart({ gaps }: SkillGapChartProps) {
  const [chartType, setChartType] = useState<"radar" | "bar">("radar");
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const handleHoverSkill = useCallback((skill: string | null) => {
    setHoveredSkill(skill);
  }, []);

  const chartData = useMemo(
    () =>
      gaps.map((g) => ({
        skill: g.skill,
        level: g.user_level,
        required: g.required_level === "required" ? 1.0 : 0.7,
        severity: g.gap_severity,
      })),
    [gaps],
  );

  const radarData = useMemo(
    () =>
      gaps.slice(0, 10).map((g) => ({
        skill:
          (g.skill?.length ?? 0) > 12
            ? g.skill.slice(0, 12) + "…"
            : (g.skill ?? ""),
        "Your Level": Math.round(g.user_level * 100),
        Required: g.required_level === "required" ? 100 : 70,
      })),
    [gaps],
  );

  if (gaps.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No skill gaps to display.
      </div>
    );
  }

  return (
    <ChartCard
      title="Skill Comparison"
      height={350}
      ariaLabel="Chart comparing your skill levels to required levels"
      action={
        <ToggleGroup
          type="single"
          value={chartType}
          onValueChange={(v) => v && setChartType(v as "radar" | "bar")}
          size="sm"
        >
          <ToggleGroupItem value="radar">Radar</ToggleGroupItem>
          <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {chartType === "radar" ? (
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="skill" tick={CHART_AXIS.tickBold} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ ...CHART_AXIS.tick, fontSize: 10 }}
          />
          <Radar
            name="Your Level"
            dataKey="Your Level"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
          <Radar
            name="Required"
            dataKey="Required"
            stroke="hsl(var(--muted-foreground))"
            fill="hsl(var(--muted-foreground))"
            fillOpacity={0.1}
          />
          <Legend
            wrapperStyle={{
              color: "hsl(var(--foreground))",
              fontSize: "12px",
            }}
          />
        </RadarChart>
      ) : (
        <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
          <Tooltip
            formatter={(v) => `${Math.round(Number(v) * 100)}%`}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar
            dataKey="level"
            name="Your Level"
            radius={[0, 3, 3, 0]}
            animationDuration={600}
            animationEasing="ease-out"
            onMouseEnter={(_: unknown, index: number) =>
              handleHoverSkill(chartData[index]?.skill ?? null)
            }
            onMouseLeave={() => handleHoverSkill(null)}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.skill}
                fill={GAP_COLOR[entry.severity]}
                opacity={
                  hoveredSkill === null || hoveredSkill === entry.skill
                    ? 1
                    : 0.35
                }
                strokeWidth={hoveredSkill === entry.skill ? 2 : 0}
                stroke={
                  hoveredSkill === entry.skill
                    ? "hsl(var(--background))"
                    : "none"
                }
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartCard>
  );
}
