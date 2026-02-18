"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import GapTable from "@/components/gap-table";
import WorkflowStepper from "@/components/workflow-stepper";
import EmptyState from "@/components/empty-state";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";

const GAP_COLORS: Record<string, string> = {
  none: "#28c76f",
  low: "#00BFFF",
  medium: "#f9a825",
  high: "#e84848",
};

const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9d4cc",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#1a1a1a",
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

export default function SkillGap() {
  const [gaps, setGaps] = useState<RoleGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [tab, setTab] = useState("0");
  const [chartType, setChartType] = useState("radar");

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      setHasProfile(false);
      setLoading(false);
      return;
    }
    setHasProfile(true);
    api
      .get(`/api/skill-gap/${profileId}`)
      .then((res) => setGaps(res.data.gaps))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load skill gaps"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div><WorkflowStepper /><SkeletonCard count={2} /></div>;
  if (error) return <div><WorkflowStepper /><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;

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

  const tabIdx = parseInt(tab);
  const currentGap = gaps[tabIdx] || gaps[0];
  const score = Math.round(currentGap.match_score * 100);
  const chartData = currentGap.gaps.map((g) => ({
    skill: g.skill,
    level: g.user_level,
    required: g.required_level === "required" ? 1.0 : 0.7,
    severity: g.gap_severity,
  }));

  const radarData = currentGap.gaps.slice(0, 10).map((g) => ({
    skill: g.skill.length > 12 ? g.skill.slice(0, 12) + "…" : g.skill,
    "Your Level": Math.round(g.user_level * 100),
    Required: g.required_level === "required" ? 100 : 70,
  }));

  return (
    <div className="space-y-5">
      <WorkflowStepper />

      <header>
        <p className="section-label mb-1">Analysis</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Skill Gap Analysis</h1>
      </header>

      {/* Role selector */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {gaps.map((g, i) => (
            <TabsTrigger key={g.role_title} value={String(i)}>{g.role_title}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Score + chart toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{currentGap.role_title}</span>
          <Badge variant={score >= 70 ? "success" : score >= 40 ? "warning" : "destructive"} className="data-num">
            {score}% Match
          </Badge>
        </div>
        <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v)} size="sm">
          <ToggleGroupItem value="radar">Radar</ToggleGroupItem>
          <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Chart */}
      <Card variant="data">
        <CardContent className="p-4">
          <div className="h-[350px]" role="img" aria-label="Chart comparing your skill levels to required levels">
            <ResponsiveContainer>
              {chartType === "radar" ? (
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d9d4cc" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#374151", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Radar name="Your Level" dataKey="Your Level" stroke="#00BFFF" fill="#00BFFF" fillOpacity={0.3} />
                  <Radar name="Required" dataKey="Required" stroke="#e8562a" fill="#e8562a" fillOpacity={0.1} />
                  <Legend wrapperStyle={{ color: "#374151", fontSize: "12px" }} />
                </RadarChart>
              ) : (
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                  <XAxis type="number" domain={[0, 1]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis type="category" dataKey="skill" width={100} tick={{ fill: "#374151", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `${Math.round(Number(v) * 100)}%`}
                    contentStyle={CHART_STYLE.contentStyle}
                  />
                  <Bar dataKey="level" name="Your Level" radius={[0, 3, 3, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.skill} fill={GAP_COLORS[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <GapTable gaps={currentGap.gaps} />

      {/* Unused TabsContent to satisfy Tabs children requirement */}
      {gaps.map((_, i) => (
        <TabsContent key={i} value={String(i)} />
      ))}
    </div>
  );
}
