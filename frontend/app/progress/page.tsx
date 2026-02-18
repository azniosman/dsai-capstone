"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

interface ProgressEntry {
  skill: string;
  level: number;
  recorded_at: string;
}

interface ProgressData {
  skills_acquired: number;
  skills_in_progress: number;
  skills_total: number;
  entries: ProgressEntry[];
}

interface TimelinePoint {
  date: string;
  skill: string;
  level: number;
}

const CHART_COLORS = ["#00BFFF", "#e8562a", "#28c76f", "#f9a825", "#9b6de0", "#e84848"];

const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9d4cc",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#1a1a1a",
  },
};

export default function ProgressDashboard() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState("0.5");

  const profileId = typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  useEffect(() => {
    if (!profileId) { router.push("/"); return; }
    const controller = new AbortController();
    const loadData = async () => {
      setLoading(true);
      try {
        const [progRes, timeRes] = await Promise.all([
          api.get(`/api/progress/${profileId}`, { signal: controller.signal }),
          api.get(`/api/progress/${profileId}/timeline`, { signal: controller.signal }),
        ]);
        setProgress(progRes.data);
        setTimeline(timeRes.data.timeline);
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setError(extractApiError(err, "Failed to load progress"));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadData();
    return () => controller.abort();
  }, [profileId, router]);

  const loadData = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const [progRes, timeRes] = await Promise.all([
        api.get(`/api/progress/${profileId}`),
        api.get(`/api/progress/${profileId}/timeline`),
      ]);
      setProgress(progRes.data);
      setTimeline(timeRes.data.timeline);
    } catch (err: unknown) {
      setError(extractApiError(err, "Failed to load progress"));
    } finally {
      setLoading(false);
    }
  };

  const recordProgress = async () => {
    if (!newSkill.trim() || !profileId) return;
    try {
      await api.post("/api/progress", {
        profile_id: parseInt(profileId),
        skill: newSkill.trim(),
        level: parseFloat(newLevel),
      });
      toast.success(`Recorded progress for "${newSkill.trim()}"!`);
      setNewSkill("");
      loadData();
    } catch {
      toast.error("Failed to record progress");
    }
  };

  if (loading) return <div className="flex justify-center mt-8"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  const dateMap: Record<string, Record<string, number>> = {};
  timeline.forEach((t) => {
    if (!t.date) return;
    if (!dateMap[t.date]) dateMap[t.date] = { date: t.date } as unknown as Record<string, number>;
    (dateMap[t.date] as Record<string, unknown>)[t.skill] = t.level;
  });
  const chartData = Object.values(dateMap);
  const allSkills = [...new Set(timeline.map((t) => t.skill))];

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Tracking</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Progress Dashboard</h1>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="metric" className="text-center">
          <CardContent className="p-5">
            <div className="kpi-number text-emerald-500" style={{ fontSize: "2.25rem" }}>
              {progress?.skills_acquired || 0}
            </div>
            <p className="section-label mt-2">Acquired</p>
          </CardContent>
        </Card>
        <Card variant="metric" className="text-center">
          <CardContent className="p-5">
            <div className="kpi-number text-amber-500" style={{ fontSize: "2.25rem" }}>
              {progress?.skills_in_progress || 0}
            </div>
            <p className="section-label mt-2">In Progress</p>
          </CardContent>
        </Card>
        <Card variant="metric" className="text-center">
          <CardContent className="p-5">
            <div className="kpi-number-accent" style={{ fontSize: "2.25rem" }}>
              {progress?.skills_total || 0}
            </div>
            <p className="section-label mt-2">Total Tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Record progress */}
      <Card variant="data">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <p className="section-label">Record Skill Progress</p>
          </div>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <Label htmlFor="skill-name" className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.08em" }}>
                Skill Name
              </Label>
              <Input id="skill-name" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            </div>
            <div className="min-w-[150px] space-y-1.5">
              <Label className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.08em" }}>Level</Label>
              <Select value={newLevel} onValueChange={setNewLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Missing (0%)</SelectItem>
                  <SelectItem value="0.5">Partial (50%)</SelectItem>
                  <SelectItem value="1">Strong (100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={recordProgress}>Record</Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress chart */}
      {chartData.length > 0 && (
        <Card variant="elevated">
          <CardContent className="p-5">
            <p className="section-label mb-4">Skill Progress Over Time</p>
            <div className="h-[300px]" role="img" aria-label="Line chart showing skill progress over time">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                  <Legend wrapperStyle={{ color: "#374151", fontSize: "12px" }} />
                  {allSkills.map((skill, i) => (
                    <Line
                      key={skill}
                      type="monotone"
                      dataKey={skill}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {progress?.entries && progress.entries.length > 0 && (
        <Card variant="elevated">
          <CardContent className="p-5">
            <p className="section-label mb-4">Recent Activity</p>
            <div className="space-y-2">
              {progress.entries.slice(0, 20).map((e) => (
                <div key={`${e.skill}-${e.recorded_at}`} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <Badge
                    variant={e.level >= 1.0 ? "success" : e.level >= 0.5 ? "warning" : "muted"}
                    className="shrink-0"
                  >
                    {e.skill}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex-1">
                    {e.level >= 1.0 ? "Strong" : e.level >= 0.5 ? "Partial" : "Started"}
                  </span>
                  <span className="text-xs text-muted-foreground data-num">{e.recorded_at}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
