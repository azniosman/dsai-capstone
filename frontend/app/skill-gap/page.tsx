"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import GapTable from "@/components/skill-gap/gap-table";
import WorkflowStepper from "@/components/ui/workflow-stepper";
import EmptyState from "@/components/ui/empty-state";
import SkeletonCard from "@/components/ui/skeleton-card";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";
import { GAP_COLOR, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-colors";

interface GapItem {
  skill: string;
  user_level: number;
  required_level: string;
  user_level_label: string;
  gap_severity: string;
  priority: string;
}

interface RoleGap {
  role_title: string;
  match_score: number;
  gaps: GapItem[];
}

function SkillGapView({ gap }: { gap: RoleGap }) {
  const [chartType, setChartType] = useState("radar");
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const score = Math.round(gap.match_score * 100);

  const handleHoverSkill = useCallback((skill: string | null) => {
    setHoveredSkill(skill);
  }, []);

  const chartData = useMemo(
    () =>
      gap.gaps.map((g) => ({
        skill: g.skill,
        level: g.user_level,
        required: g.required_level === "required" ? 1.0 : 0.7,
        severity: g.gap_severity,
      })),
    [gap.gaps],
  );

  const radarData = useMemo(
    () =>
      gap.gaps.slice(0, 10).map((g) => ({
        skill: (g.skill?.length ?? 0) > 12 ? g.skill.slice(0, 12) + "…" : (g.skill ?? ""),
        "Your Level": Math.round(g.user_level * 100),
        Required: g.required_level === "required" ? 100 : 70,
      })),
    [gap.gaps],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Score header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{gap.role_title}</span>
        <Badge
          variant={
            score >= 70 ? "success" : score >= 40 ? "warning" : "destructive"
          }
          className="data-num"
        >
          {score}% Match
        </Badge>
      </div>

      {/* Chart */}
      <ChartCard
        title="Skill Comparison"
        height={350}
        ariaLabel="Chart comparing your skill levels to required levels"
        action={
          <ToggleGroup
            type="single"
            value={chartType}
            onValueChange={(v) => v && setChartType(v)}
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
            <CartesianGrid {...CHART_AXIS.grid} />
            <XAxis type="number" domain={[0, 1]} tick={CHART_AXIS.tick} />
            <YAxis
              type="category"
              dataKey="skill"
              width={100}
              tick={CHART_AXIS.tickBold}
            />
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

      <GapTable
        gaps={gap.gaps}
        hoveredSkill={hoveredSkill}
        onHoverSkill={handleHoverSkill}
      />
    </div>
  );
}

export default function SkillGap() {
  const [gaps, setGaps] = useState<RoleGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  // Initial tab is "0" (string)
  const [tab, setTab] = useState("0");

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      setTimeout(() => {
        setHasProfile(false);
        setLoading(false);
      }, 0);
      return;
    }
    setTimeout(() => setHasProfile(true), 0);
    api
      .get(`/api/skill-gap/${profileId}`)
      .then((res) => setGaps(res.data.gaps))
      .catch((err: unknown) =>
        setError(extractApiError(err, "Failed to load skill gaps")),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div>
        <WorkflowStepper />
        <SkeletonCard count={2} />
      </div>
    );
  if (error)
    return (
      <div>
        <WorkflowStepper />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );

  if (!hasProfile || gaps.length === 0) {
    return (
      <div>
        <WorkflowStepper />
        <EmptyState
          icon={<BarChart3 />}
          title="No skill gaps to show"
          description="Create a profile first to see how your skills compare to target roles."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkflowStepper />

      <header>
        <p className="section-label mb-1">Analysis</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Skill Gap Analysis
        </h1>
      </header>

      {/* Role selector (Custom Tabs implementation) */}
      <div className="flex flex-col space-y-6">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-fit">
          {gaps.map((g, i) => (
            <button
              key={g.role_title}
              onClick={() => setTab(String(i))}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                tab === String(i)
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50 hover:text-foreground"
              }`}
            >
              {g.role_title}
            </button>
          ))}
        </div>

        {/* Content Area — AnimatePresence re-mounts active tab so charts re-animate */}
        <AnimatePresence mode="wait">
          {gaps.map((gap, i) =>
            tab === String(i) ? (
              <motion.div
                key={gap.role_title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.22,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
              >
                <SkillGapView gap={gap} />
              </motion.div>
            ) : null,
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
