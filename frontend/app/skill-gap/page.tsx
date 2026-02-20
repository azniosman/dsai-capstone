"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import GapTable from "@/components/gap-table";
import WorkflowStepper from "@/components/workflow-stepper";
import EmptyState from "@/components/empty-state";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

// Gap severity colors — semantic palette, consistent with status utilities
const GAP_COLORS: Record<string, string> = {
  none: "hsl(145 60% 36%)", // green — no gap
  low: "hsl(220 80% 55%)", // blue  — small gap
  medium: "hsl(40 90% 45%)", // amber — medium gap
  high: "hsl(5 78% 50%)", // red   — critical gap
};

// Recharts tooltip style — matches card bg/border in light mode
const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "oklch(0.9699 0.0013 106.4238)",
    border: "1px solid oklch(0.8687 0.0043 56.366)",
    borderRadius: "12px",
    fontSize: "12px",
    color: "oklch(0.2795 0.0368 260.031)",
    boxShadow: "2px 2px 10px 4px hsl(240 4% 60% / 0.18)",
  },
};

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
  const score = Math.round(gap.match_score * 100);

  const chartData = gap.gaps.map((g) => ({
    skill: g.skill,
    level: g.user_level,
    required: g.required_level === "required" ? 1.0 : 0.7,
    severity: g.gap_severity,
  }));

  const radarData = gap.gaps.slice(0, 10).map((g) => ({
    skill: g.skill.length > 12 ? g.skill.slice(0, 12) + "…" : g.skill,
    "Your Level": Math.round(g.user_level * 100),
    Required: g.required_level === "required" ? 100 : 70,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Score + chart toggle */}
      <div className="flex justify-between items-center">
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
        <ToggleGroup
          type="single"
          value={chartType}
          onValueChange={(v) => v && setChartType(v)}
          size="sm"
        >
          <ToggleGroupItem value="radar">Radar</ToggleGroupItem>
          <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Chart */}
      <Card variant="data">
        <CardContent className="p-4">
          <div
            className="h-[350px]"
            role="img"
            aria-label="Chart comparing your skill levels to required levels"
          >
            <ResponsiveContainer>
              {chartType === "radar" ? (
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d9d4cc" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#374151", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                  />
                  <Radar
                    name="Your Level"
                    dataKey="Your Level"
                    stroke="#00BFFF"
                    fill="#00BFFF"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Required"
                    dataKey="Required"
                    stroke="#e8562a"
                    fill="#e8562a"
                    fillOpacity={0.1}
                  />
                  <Legend
                    wrapperStyle={{ color: "#374151", fontSize: "12px" }}
                  />
                </RadarChart>
              ) : (
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={100}
                    tick={{ fill: "#374151", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v) => `${Math.round(Number(v) * 100)}%`}
                    contentStyle={CHART_STYLE.contentStyle}
                  />
                  <Bar dataKey="level" name="Your Level" radius={[0, 3, 3, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.skill}
                        fill={GAP_COLORS[entry.severity]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <GapTable gaps={gap.gaps} />
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

        {/* Content Area */}
        {gaps.map((gap, i) => (
          <div
            key={i}
            className={
              tab === String(i)
                ? "block animate-in fade-in slide-in-from-left-1 duration-300"
                : "hidden"
            }
          >
            <SkillGapView gap={gap} />
          </div>
        ))}
      </div>
    </div>
  );
}
