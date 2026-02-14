"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const GAP_COLORS: Record<string, string> = { none: "#4caf50", low: "#2196f3", medium: "#ff9800", high: "#f44336" };

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
  const [tab, setTab] = useState("0");
  const [chartType, setChartType] = useState("radar");

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setLoading(false); return; }
    api
      .get(`/api/skill-gap/${profileId}`)
      .then((res) => setGaps(res.data.gaps))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load skill gaps"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div><WorkflowStepper /><SkeletonCard count={2} /></div>;
  if (error) return <div><WorkflowStepper /><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;

  if (!localStorage.getItem("profileId") || gaps.length === 0) {
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
  const chartData = currentGap.gaps.map((g) => ({
    skill: g.skill,
    level: g.user_level,
    required: g.required_level === "required" ? 1.0 : 0.7,
    severity: g.gap_severity,
  }));

  const radarData = currentGap.gaps.slice(0, 10).map((g) => ({
    skill: g.skill.length > 12 ? g.skill.slice(0, 12) + "..." : g.skill,
    "Your Level": Math.round(g.user_level * 100),
    Required: g.required_level === "required" ? 100 : 70,
  }));

  return (
    <div>
      <WorkflowStepper />
      <h1 className="text-2xl font-bold mb-4">Skill Gap Analysis</h1>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {gaps.map((g, i) => (
            <TabsTrigger key={g.role_title} value={String(i)}>{g.role_title}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium">
          {currentGap.role_title} — Match: {Math.round(currentGap.match_score * 100)}%
        </p>
        <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v)} size="sm">
          <ToggleGroupItem value="radar">Radar</ToggleGroupItem>
          <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="p-4 mb-6">
        <CardContent className="p-0">
          <div className="h-[350px]" role="img" aria-label="Chart comparing your skill levels to required levels">
            <ResponsiveContainer>
              {chartType === "radar" ? (
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Your Level" dataKey="Your Level" stroke="#1565c0" fill="#1565c0" fillOpacity={0.4} />
                  <Radar name="Required" dataKey="Required" stroke="#f44336" fill="#f44336" fillOpacity={0.1} />
                  <Legend />
                </RadarChart>
              ) : (
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis type="category" dataKey="skill" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${Math.round(Number(v) * 100)}%`} />
                  <Bar dataKey="level" name="Your Level">
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
    </div>
  );
}
